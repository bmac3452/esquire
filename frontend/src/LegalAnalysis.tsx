import { useState, useEffect } from 'react';
import { request } from './api';

interface DocumentAnalysis {
  id: string;
  title: string;
  documentType: string;
  analysisStatus: string;
  createdAt: string;
  client?: {
    id: string;
    name: string;
  };
  inconsistencies?: any[];
  constitutionalIssues?: any[];
  suggestedCaseLaws?: any[];
  legalArguments?: any[];
  aiSummary?: string;
  caseLawDetails?: any[];
}

export default function LegalAnalysis() {
  const [analyses, setAnalyses] = useState<DocumentAnalysis[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<DocumentAnalysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyses();
    fetchClients();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const data = await request<DocumentAnalysis[]>('/legal/analyses');
      setAnalyses(data);
    } catch (err) {
      console.error('Failed to fetch analyses:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const data = await request<any[]>('/clients');
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${(window as any).API_URL || 'https://esquire-api.onrender.com'}/legal/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      alert(`Document uploaded! Analysis ID: ${data.id}`);
      fetchAnalyses();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const viewAnalysis = async (id: string) => {
    try {
      const data = await request<DocumentAnalysis>(`/legal/analyses/${id}`);
      setSelectedAnalysis(data);
    } catch (err) {
      console.error('Failed to fetch analysis:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 border-red-500 text-red-700';
      case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-700';
      case 'low': return 'bg-blue-100 border-blue-500 text-blue-700';
      default: return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Legal Document Analysis</h1>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Upload Document for AI Analysis</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Document Title</label>
            <input
              type="text"
              name="title"
              required
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Police Statement - Case #12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Document Type</label>
            <select name="documentType" required className="w-full border rounded px-3 py-2">
              <option value="affidavit">Affidavit</option>
              <option value="police_statement">Police Statement</option>
              <option value="evidence">Evidence Document</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client (Optional)</label>
            <select name="clientId" className="w-full border rounded px-3 py-2">
              <option value="">-- No Client --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Upload File (PDF or Text)</label>
            <input
              type="file"
              name="document"
              required
              accept=".pdf,.txt,.png,.jpg,.jpeg"
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">Supported: PDF, TXT, JPEG, PNG (max 10MB)</p>
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Uploading & Analyzing...' : 'Upload & Analyze'}
          </button>
        </form>
      </div>

      {/* Analyses List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Analyses</h2>
        
        {analyses.length === 0 ? (
          <p className="text-gray-500">No analyses yet. Upload a document above to get started.</p>
        ) : (
          <div className="space-y-3">
            {analyses.map(analysis => (
              <div
                key={analysis.id}
                className="border rounded p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => viewAnalysis(analysis.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{analysis.title}</h3>
                    <p className="text-sm text-gray-600">
                      Type: {analysis.documentType.replace('_', ' ')}
                      {analysis.client && ` • Client: ${analysis.client.name}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    analysis.analysisStatus === 'completed' ? 'bg-green-100 text-green-700' :
                    analysis.analysisStatus === 'analyzing' ? 'bg-yellow-100 text-yellow-700' :
                    analysis.analysisStatus === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {analysis.analysisStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Details Modal */}
      {selectedAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedAnalysis.title}</h2>
                <p className="text-gray-600">
                  {selectedAnalysis.documentType.replace('_', ' ')} • {new Date(selectedAnalysis.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedAnalysis.analysisStatus !== 'completed' ? (
              <div className="text-center py-12">
                <p className="text-lg text-gray-600">
                  Analysis Status: <strong>{selectedAnalysis.analysisStatus}</strong>
                </p>
                {selectedAnalysis.analysisStatus === 'analyzing' && (
                  <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds...</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Summary */}
                {selectedAnalysis.aiSummary && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                    <h3 className="font-semibold text-lg mb-2">📊 AI Analysis Summary</h3>
                    <p className="whitespace-pre-wrap">{selectedAnalysis.aiSummary}</p>
                  </div>
                )}

                {/* Inconsistencies */}
                {selectedAnalysis.inconsistencies && selectedAnalysis.inconsistencies.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">🚨 Inconsistencies & Loopholes</h3>
                    <div className="space-y-3">
                      {selectedAnalysis.inconsistencies.map((item: any, idx: number) => (
                        <div key={idx} className={`border-l-4 p-4 ${getSeverityColor(item.severity)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{item.issue}</h4>
                            <span className="text-xs uppercase px-2 py-1 rounded bg-white">
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-sm italic mb-2">"{item.text}"</p>
                          <p className="text-sm">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constitutional Issues */}
                {selectedAnalysis.constitutionalIssues && selectedAnalysis.constitutionalIssues.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">⚖️ Constitutional Violations</h3>
                    <div className="space-y-3">
                      {selectedAnalysis.constitutionalIssues.map((item: any, idx: number) => (
                        <div key={idx} className={`border-l-4 p-4 ${getSeverityColor(item.severity)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{item.amendment} Amendment</h4>
                            <span className="text-xs uppercase px-2 py-1 rounded bg-white">
                              {item.severity}
                            </span>
                          </div>
                          <p className="text-sm font-medium mb-1">{item.violation}</p>
                          <p className="text-sm">{item.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Case Laws */}
                {selectedAnalysis.caseLawDetails && selectedAnalysis.caseLawDetails.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">📜 Relevant Case Law Precedents</h3>
                    <div className="space-y-4">
                      {selectedAnalysis.caseLawDetails.map((caseLaw: any) => (
                        <div key={caseLaw.id} className="border rounded p-4 bg-gray-50">
                          <h4 className="font-semibold text-lg">{caseLaw.caseName}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {caseLaw.citation} • {caseLaw.year} • {caseLaw.court}
                          </p>
                          <p className="text-sm mb-2"><strong>Category:</strong> {caseLaw.category}</p>
                          <p className="text-sm mb-2"><strong>Summary:</strong> {caseLaw.summary}</p>
                          <div className="bg-white p-3 rounded mt-2">
                            <p className="text-xs font-semibold mb-1">Relevant Text:</p>
                            <p className="text-sm italic">"{caseLaw.relevantText}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Legal Arguments */}
                {selectedAnalysis.legalArguments && selectedAnalysis.legalArguments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">💡 Recommended Legal Arguments</h3>
                    <div className="space-y-3">
                      {selectedAnalysis.legalArguments.map((arg: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-green-500 p-4 bg-green-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold">{arg.argument}</h4>
                            <span className="text-xs uppercase px-2 py-1 rounded bg-white">
                              {arg.strength} strength
                            </span>
                          </div>
                          <p className="text-sm">{arg.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="px-6 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
