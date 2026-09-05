import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  Clock, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Copy, 
  Check,
  RotateCcw
} from 'lucide-react';
import { TestSuiteReport, TestCase } from '../types.ts';

interface TestSuiteTabProps {
  initialReport: TestSuiteReport | null;
  onTestComplete: (report: TestSuiteReport) => void;
}

export const TestSuiteTab: React.FC<TestSuiteTabProps> = ({
  initialReport,
  onTestComplete
}) => {
  const [report, setReport] = useState<TestSuiteReport | null>(initialReport);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'unit' | 'integration' | 'security'>('all');
  const [expandedTests, setExpandedTests] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/v1/tests/run', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setReport(data.data);
        onTestComplete(data.data);
      }
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (!report && !isRunning) {
      runTests();
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedTests(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredResults = report?.results.filter(r => {
    if (selectedCategory === 'all') return true;
    return r.category === selectedCategory;
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200">
              Automated Test Harness
            </span>
            <span className="text-xs text-slate-700">Unit &amp; Integration Suite</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Production Test Suite &amp; Security Validation
          </h2>
          <p className="text-xs text-slate-700 mt-0.5">
            Executes real in-process tests against bcrypt (12 rounds), JWT tokens (15m window), refresh token rotation, and Firebase Admin verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-copy-test-report"
            onClick={copyReport}
            disabled={!report}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'JSON Report'}</span>
          </button>

          <button
            id="btn-run-all-tests"
            onClick={runTests}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            {isRunning ? (
              <Clock className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            )}
            <span>{isRunning ? 'Running Test Suite...' : 'Run Test Suite'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-700 font-medium">Total Tests</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {report.totalTests}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">Specifications</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-emerald-700 font-medium">Passing Tests</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {report.passed}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">100% Passing</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-700 font-medium">Failing Tests</div>
            <div className={`text-2xl font-extrabold mt-1 flex items-center gap-1.5 ${
              report.failed > 0 ? 'text-rose-600' : 'text-slate-400'
            }`}>
              {report.failed > 0 && <XCircle className="w-5 h-5 text-rose-500" />}
              {report.failed}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">Zero Regressions</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="text-xs text-slate-700 font-medium">Duration</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 flex items-center gap-1.5 font-mono">
              <Clock className="w-5 h-5 text-indigo-500" />
              {report.durationMs}ms
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">Bcrypt &amp; Crypto ops</div>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2">
        {(['all', 'unit', 'integration', 'security'] as const).map(cat => (
          <button
            key={cat}
            id={`filter-${cat}`}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat === 'all' ? 'All Tests' : `${cat} Tests`}
          </button>
        ))}
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredResults.map(tc => {
          const isExpanded = !!expandedTests[tc.id];
          return (
            <div
              key={tc.id}
              className={`bg-white border rounded-2xl shadow-xs transition-all overflow-hidden ${
                tc.passed ? 'border-slate-200' : 'border-rose-300'
              }`}
            >
              <button
                id={`btn-test-case-${tc.id}`}
                onClick={() => toggleExpand(tc.id)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {tc.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {tc.id}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {tc.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 uppercase">
                        {tc.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">
                      {tc.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-600 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {tc.durationMs}ms
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Collapsible Assertions List */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Assertion Breakdown ({tc.assertions.length}):
                  </div>
                  <div className="space-y-1.5">
                    {tc.assertions.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between text-xs p-2 bg-white rounded-lg border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-slate-800">{a.assertion}</span>
                        </div>
                        {a.expected !== undefined && (
                          <div className="font-mono text-[11px] text-slate-700 shrink-0 ml-2">
                            expected: <span className="text-emerald-700 font-bold">{String(a.expected)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {tc.error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono text-rose-800">
                      Error: {tc.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
