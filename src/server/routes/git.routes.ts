import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);
export const gitRouter = Router();

/**
 * GET /api/v1/git/status
 * Get the current repository branch, commit, and remote configuration.
 */
gitRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const { stdout: branchOut } = await execAsync('git branch --show-current');
    const branch = branchOut.trim() || 'main';

    let lastCommit = 'Unknown';
    try {
      const { stdout: commitOut } = await execAsync('git log -1 --format="%h - %s (%cr)"');
      lastCommit = commitOut.trim();
    } catch {
      // ignore
    }

    let remoteUrl = '';
    try {
      const { stdout: remoteOut } = await execAsync('git remote get-url origin');
      remoteUrl = remoteOut.trim();
    } catch {
      // no remote configured yet
    }

    const { stdout: statusOut } = await execAsync('git status --porcelain');
    const isClean = statusOut.trim().length === 0;

    res.json({
      success: true,
      data: {
        branch,
        lastCommit,
        remoteUrl,
        isClean,
        statusSummary: isClean ? 'Clean working tree' : `${statusOut.trim().split('\n').length} modified files`
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'GIT_STATUS_ERROR',
        message: err.message || 'Failed to inspect git repository status'
      }
    });
  }
});

/**
 * POST /api/v1/git/push
 * Push current branch to GitHub repository.
 */
gitRouter.post('/push', async (req: Request, res: Response) => {
  const { repoUrl, token, branch = 'main' } = req.body;

  if (!repoUrl) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_REPO_URL',
        message: 'Repository URL is required (e.g. https://github.com/dhundreed/authforge-service.git)'
      }
    });
    return;
  }

  try {
    // 1. Commit any untracked or modified files if any
    try {
      await execAsync('git add .');
      await execAsync('git commit -m "chore: updates prior to push"');
    } catch {
      // Nothing new to commit, which is fine
    }

    // 2. Ensure origin remote is set
    let authenticatedUrl = repoUrl.trim();
    if (token) {
      // Inject token into HTTPS url: https://<token>@github.com/user/repo.git
      const cleanUrl = repoUrl.replace(/^https?:\/\//, '');
      authenticatedUrl = `https://${encodeURIComponent(token.trim())}@${cleanUrl}`;
    }

    try {
      await execAsync('git remote get-url origin');
      await execAsync(`git remote set-url origin "${authenticatedUrl}"`);
    } catch {
      await execAsync(`git remote add origin "${authenticatedUrl}"`);
    }

    // 3. Ensure branch is main
    await execAsync(`git branch -M ${branch}`);

    // 4. Execute git push with a 30s timeout
    const { stdout, stderr } = await execAsync(`git push -u origin ${branch}`, {
      timeout: 30000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    res.json({
      success: true,
      message: `Successfully pushed branch '${branch}' to GitHub!`,
      data: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        pushedAt: new Date().toISOString()
      }
    });
  } catch (err: any) {
    const errorMsg = err.stderr || err.message || 'Git push failed';
    res.status(400).json({
      success: false,
      error: {
        code: 'GIT_PUSH_FAILED',
        message: errorMsg,
        guidance: errorMsg.includes('Authentication failed') || errorMsg.includes('could not read Username')
          ? 'Authentication required. Please provide a GitHub Personal Access Token (PAT) with repo permissions, or use AI Studio Settings > Export to GitHub for 1-click authorization.'
          : errorMsg
      }
    });
  }
});

/**
 * GET /api/v1/git/download-bundle
 * Downloads a complete ZIP package of the project source code.
 */
gitRouter.get('/download-bundle', async (req: Request, res: Response) => {
  const tempZipPath = path.join('/tmp', `authforge-bundle-${Date.now()}.zip`);
  const pythonScript = `
import zipfile, os

with zipfile.ZipFile('${tempZipPath}', 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.git', 'dist', 'build', '.cache')]
        for f in files:
            p = os.path.join(root, f)
            z.write(p, os.path.relpath(p, '.'))
`;

  try {
    await execAsync(`python3 -c "${pythonScript.replace(/"/g, '\\"')}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="authforge-complete-bundle.zip"');
    res.download(tempZipPath, 'authforge-complete-bundle.zip', (err) => {
      try {
        if (fs.existsSync(tempZipPath)) {
          fs.unlinkSync(tempZipPath);
        }
      } catch {
        // ignore
      }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'ARCHIVE_ERROR',
        message: err.message || 'Failed to generate project zip bundle'
      }
    });
  }
});

/**
 * GET and HEAD /api/v1/git/download-apk
 * Downloads the compiled native Android APK package (authforge-app-v1.2.0-release.apk).
 */
const handleApkDownload = (req: Request, res: Response) => {
  const possiblePaths = [
    path.resolve(process.cwd(), 'public/downloads/authforge-app-release.apk'),
    path.resolve(process.cwd(), 'dist/downloads/authforge-app-release.apk'),
    path.resolve('/tmp/authforge-app-release.apk')
  ];

  const apkPath = possiblePaths.find(p => fs.existsSync(p));

  if (!apkPath) {
    res.status(404).json({
      success: false,
      error: {
        code: 'APK_NOT_FOUND',
        message: 'Android APK package is currently not available on disk.'
      }
    });
    return;
  }

  const stat = fs.statSync(apkPath);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="authforge-app-v1.2.0-release.apk"');
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');

  if (req.method === 'HEAD') {
    res.status(200).end();
    return;
  }

  res.sendFile(apkPath, (err) => {
    if (err && !res.headersSent) {
      console.error('Error sending APK file:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'FILE_STREAM_ERROR',
          message: 'Failed to stream Android APK package'
        }
      });
    }
  });
};

gitRouter.get('/download-apk', handleApkDownload);
gitRouter.head('/download-apk', handleApkDownload);
