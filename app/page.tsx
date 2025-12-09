'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Grid3x3,
  Loader2,
  X,
  Activity,
  Database,
  Zap,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface FileData {
  name: string
  size: number
  rows: number
  columns: number
  headers: string[]
  preview: Record<string, any>[]
}

interface AnalysisResult {
  summary: {
    totalRows: number
    totalColumns: number
    completenessScore: number
    memorySize: string
  }
  dataQuality: {
    missingValues: Record<string, number>
    duplicateRows: number
    dataTypeIssues: string[]
  }
  statistics: Record<string, any>
  correlations: Array<{
    column1: string
    column2: string
    correlation: number
  }>
  patterns: {
    trends: string[]
    distributions: Record<string, string>
    outliers: string[]
  }
  insights: Array<{
    title: string
    description: string
    severity: 'info' | 'warning' | 'success'
  }>
}

const SAMPLE_CSV = `Name,Age,Salary,Department,Experience,Performance
John Doe,32,75000,Engineering,8,4.5
Jane Smith,28,65000,Marketing,5,4.2
Bob Johnson,45,95000,Engineering,20,4.8
Alice Williams,35,85000,Sales,12,4.3
Charlie Brown,29,70000,Marketing,6,4.1
David Davis,52,120000,Engineering,28,4.9
Emma Wilson,26,60000,HR,3,3.8
Frank Miller,38,88000,Sales,15,4.4
Grace Lee,41,92000,Engineering,18,4.7
Henry Taylor,30,72000,Marketing,7,4.0
Iris Chen,36,87000,Sales,13,4.5
Jack Martinez,25,58000,HR,2,3.7
Karen Anderson,44,98000,Engineering,21,4.8
Leo Thompson,33,79000,Marketing,9,4.3
Mary Jackson,39,90000,Sales,16,4.6`

export default function HomePage() {
  const [fileData, setFileData] = useState<FileData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('summary')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string, fileName: string): FileData => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      return headers.reduce((obj, header, idx) => {
        obj[header] = values[idx] || ''
        return obj
      }, {} as Record<string, any>)
    })

    return {
      name: fileName,
      size: text.length,
      rows: data.length,
      columns: headers.length,
      headers,
      preview: data.slice(0, 10),
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const parsed = parseCSV(text, file.name)
        setFileData(parsed)
        setAnalysis(null)
      } catch (err) {
        setError('Failed to parse CSV file. Please ensure it has valid CSV format.')
      }
    }
    reader.readAsText(file)
  }

  const handleDragDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file?.type === 'text/csv' || file?.name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string
          const parsed = parseCSV(text, file.name)
          setFileData(parsed)
          setAnalysis(null)
        } catch (err) {
          setError('Failed to parse CSV file. Please ensure it has valid CSV format.')
        }
      }
      reader.readAsText(file)
    } else {
      setError('Please upload a valid CSV file')
    }
  }

  const analyzeData = async () => {
    if (!fileData) return

    setLoading(true)
    setError(null)

    try {
      const csvContent = [
        fileData.headers.join(','),
        ...fileData.preview.map(row =>
          fileData.headers.map(h => row[h] || '').join(',')
        ),
      ].join('\n')

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze this CSV data and provide comprehensive analysis:\n\n${csvContent}\n\nProvide detailed statistics, data quality assessment, correlations, patterns, and actionable insights. Format as JSON with these sections: summary, dataQuality, statistics, correlations, patterns, insights.`,
          agent_id: '6937ee8ba7a2106e96809a92',
        }),
      })

      const data = await response.json()

      if (data.success && data.response) {
        const parsedData = typeof data.response === 'string'
          ? JSON.parse(data.response)
          : data.response

        const analysisData: AnalysisResult = {
          summary: {
            totalRows: fileData.rows,
            totalColumns: fileData.columns,
            completenessScore: (parsedData.summary?.completenessScore || 85) / 100,
            memorySize: `${(fileData.size / 1024).toFixed(2)} KB`,
          },
          dataQuality: parsedData.dataQuality || {
            missingValues: {},
            duplicateRows: 0,
            dataTypeIssues: [],
          },
          statistics: parsedData.statistics || {},
          correlations: parsedData.correlations || [],
          patterns: parsedData.patterns || {
            trends: [],
            distributions: {},
            outliers: [],
          },
          insights: parsedData.insights || [],
        }

        setAnalysis(analysisData)
        setActiveTab('summary')
      } else {
        setError('Failed to analyze data. Please try again.')
      }
    } catch (err) {
      setError('Error analyzing data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = () => {
    const parsed = parseCSV(SAMPLE_CSV, 'sample_data.csv')
    setFileData(parsed)
    setAnalysis(null)
    setError(null)
  }

  const downloadReport = () => {
    if (!analysis || !fileData) return

    const report = {
      fileName: fileData.name,
      timestamp: new Date().toISOString(),
      summary: analysis.summary,
      dataQuality: analysis.dataQuality,
      statistics: analysis.statistics,
      correlations: analysis.correlations,
      patterns: analysis.patterns,
      insights: analysis.insights,
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileData.name.replace('.csv', '')}_analysis.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetAnalysis = () => {
    setFileData(null)
    setAnalysis(null)
    setError(null)
    setActiveTab('summary')
  }

  if (analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <header className="sticky top-0 z-50 border-b border-slate-700/30 bg-slate-900/80 backdrop-blur-md">
          <div className="container mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <BarChart3 className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">DataLens</h1>
                  <p className="text-xs text-slate-400">Analysis Results</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={downloadReport}
                  size="sm"
                  className="gap-2 bg-pink-600 hover:bg-pink-700 text-white border-0"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  onClick={resetAnalysis}
                  size="sm"
                  variant="outline"
                  className="gap-2 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  New
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-5 hover:border-slate-700/60 transition-colors">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Total Rows</p>
              <p className="text-3xl font-bold text-white">{analysis.summary.totalRows}</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-5 hover:border-slate-700/60 transition-colors">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Total Columns</p>
              <p className="text-3xl font-bold text-white">{analysis.summary.totalColumns}</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-5 hover:border-slate-700/60 transition-colors">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">File Size</p>
              <p className="text-3xl font-bold text-pink-400">{analysis.summary.memorySize}</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-5 hover:border-slate-700/60 transition-colors">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Completeness</p>
              <p className="text-3xl font-bold text-pink-400">
                {(analysis.summary.completenessScore * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full bg-transparent border-b border-slate-700/30 p-0 rounded-none">
              <TabsTrigger value="summary" className="text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Summary
              </TabsTrigger>
              <TabsTrigger value="quality" className="text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Quality
              </TabsTrigger>
              <TabsTrigger value="statistics" className="text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Stats
              </TabsTrigger>
              <TabsTrigger value="correlations" className="hidden sm:inline-flex text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Corr
              </TabsTrigger>
              <TabsTrigger value="patterns" className="hidden sm:inline-flex text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Patterns
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-xs sm:text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent">
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-8 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">File Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700/30">
                    <span className="text-slate-400 font-medium">Filename</span>
                    <span className="text-white font-mono text-sm bg-slate-900/50 px-3 py-1 rounded">{fileData.name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700/30">
                    <span className="text-slate-400 font-medium">Dimensions</span>
                    <span className="text-white">{analysis.summary.totalRows} rows × {analysis.summary.totalColumns} columns</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-700/30">
                    <span className="text-slate-400 font-medium">File Size</span>
                    <span className="text-white">{analysis.summary.memorySize}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Completeness Score</span>
                    <span className="text-white font-semibold">{(analysis.summary.completenessScore * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">Column Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {fileData.headers.map(header => (
                      <div
                        key={header}
                        className="px-3 py-2 bg-pink-900/40 border border-pink-700/50 rounded-full text-xs font-medium text-pink-300"
                      >
                        {header}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quality" className="mt-8 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">Data Quality Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {Object.keys(analysis.dataQuality.missingValues || {}).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4 text-sm">Missing Values by Column</h4>
                      <div className="space-y-2">
                        {Object.entries(analysis.dataQuality.missingValues || {}).map(([col, count]) => (
                          <div key={col} className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">{col}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-slate-700 rounded-full h-2">
                                <div
                                  className="bg-yellow-500 h-2 rounded-full"
                                  style={{ width: `${Math.min((count as number / analysis.summary.totalRows) * 100, 100)}%` }}
                                />
                              </div>
                              <span className="text-slate-400 text-sm">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold text-white mb-4 text-sm">Duplicate Rows</h4>
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-lg ${
                        (analysis.dataQuality.duplicateRows || 0) === 0
                          ? 'bg-pink-900/20 border border-pink-700/50 text-pink-400'
                          : 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-400'
                      }`}>
                        {analysis.dataQuality.duplicateRows || 0}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {(analysis.dataQuality.duplicateRows || 0) === 0 ? 'No duplicates found' : 'Duplicate rows detected'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {(analysis.dataQuality.duplicateRows || 0) === 0
                            ? 'Dataset has clean row uniqueness'
                            : `Consider reviewing or cleaning ${analysis.dataQuality.duplicateRows} duplicate entries`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(analysis.dataQuality.dataTypeIssues || []).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Data Type Issues
                      </h4>
                      <div className="space-y-3">
                        {(analysis.dataQuality.dataTypeIssues || []).map((issue, idx) => (
                          <div key={idx} className="p-3 bg-yellow-900/10 border border-yellow-700/30 rounded text-xs text-yellow-300">
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="mt-8 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">Column Statistics</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Detailed statistical summaries for numeric columns</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(analysis.statistics || {}).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(analysis.statistics || {}).map(([colName, stats]: [string, any]) => (
                        <div key={colName} className="border border-slate-700/30 rounded-lg p-5 bg-slate-900/30">
                          <h4 className="font-semibold text-white mb-5 text-sm">{colName}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {Object.entries(stats || {}).map(([statName, value]: [string, any]) => (
                              <div key={statName}>
                                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">{statName}</p>
                                <p className="text-2xl font-bold text-white">
                                  {typeof value === 'number' ? value.toFixed(2) : value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No numeric columns available for statistical analysis</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlations" className="mt-8 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">Correlation Analysis</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Relationships between numeric columns</CardDescription>
                </CardHeader>
                <CardContent>
                  {(analysis.correlations || []).length > 0 ? (
                    <div className="space-y-4">
                      {(analysis.correlations || [])
                        .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                        .slice(0, 10)
                        .map((corr, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-900/30 rounded border border-slate-700/30 hover:bg-slate-900/50 transition-colors">
                            <div className="flex-1">
                              <p className="text-sm text-white">
                                <span className="font-semibold">{corr.column1}</span>
                                <span className="text-slate-400 mx-2">↔</span>
                                <span className="font-semibold">{corr.column2}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-28 bg-slate-700/50 rounded-full h-2">
                                <div
                                  className={cn(
                                    'h-2 rounded-full transition-all',
                                    corr.correlation > 0 ? 'bg-pink-500' : 'bg-red-500'
                                  )}
                                  style={{ width: `${Math.abs(corr.correlation) * 100}%` }}
                                />
                              </div>
                              <span className="text-white font-bold min-w-14 text-right text-sm">
                                {corr.correlation.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No correlations found. Dataset may lack numeric columns or relationships.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patterns" className="mt-8 space-y-6">
              <Card className="bg-slate-800/40 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg font-semibold">Pattern Detection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  {(analysis.patterns?.trends || []).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4 text-sm">Identified Trends</h4>
                      <div className="space-y-3">
                        {analysis.patterns.trends.map((trend, idx) => (
                          <div key={idx} className="p-3 bg-pink-900/15 border border-pink-700/30 rounded text-xs text-pink-300">
                            {trend}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(analysis.patterns?.distributions || {}).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4 text-sm">Distribution Analysis</h4>
                      <div className="space-y-3">
                        {Object.entries(analysis.patterns.distributions).map(([col, dist]) => (
                          <div key={col} className="p-3 bg-slate-900/30 border border-slate-700/30 rounded">
                            <p className="text-xs text-slate-300"><span className="font-medium text-white">{col}:</span> <span className="text-slate-400">{dist}</span></p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(analysis.patterns?.outliers || []).length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Detected Outliers
                      </h4>
                      <div className="space-y-3">
                        {analysis.patterns.outliers.map((outlier, idx) => (
                          <div key={idx} className="p-3 bg-orange-900/15 border border-orange-700/30 rounded text-xs text-orange-300">
                            {outlier}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="mt-6 space-y-4">
              {(analysis.insights || []).map((insight, idx) => (
                <Card key={idx} className="bg-slate-800 border-slate-700">
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        insight.severity === 'success' && 'bg-pink-900/30',
                        insight.severity === 'warning' && 'bg-yellow-900/30',
                        insight.severity === 'info' && 'bg-pink-900/30'
                      )}>
                        {insight.severity === 'success' && <CheckCircle className="w-5 h-5 text-pink-400" />}
                        {insight.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                        {insight.severity === 'info' && <TrendingUp className="w-5 h-5 text-pink-400" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                        <p className="text-sm text-slate-300">{insight.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-700/30 bg-slate-900/60 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <BarChart3 className="w-7 h-7 text-pink-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">DataLens</h1>
              <p className="text-base text-slate-400 mt-2">Intelligent data analysis powered by AI</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        {error && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto flex-shrink-0 text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-slate-700/30 bg-slate-800/50 backdrop-blur-sm overflow-hidden mb-10">
            <div className="p-10">
              <div className="flex items-center gap-3 mb-3">
                <Upload className="w-5 h-5 text-pink-400" />
                <h2 className="text-2xl font-bold text-white">Upload Your Data</h2>
              </div>
              <p className="text-sm text-slate-400 mb-8">Drag and drop a CSV file or click to browse</p>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDragDrop}
                className="border-2 border-dashed border-slate-600 rounded-lg p-16 text-center hover:border-pink-500/50 hover:bg-slate-900/30 transition-all cursor-pointer group"
              >
                <Upload className="w-12 h-12 text-pink-400 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-white font-semibold mb-2 text-lg">Drag and drop your CSV</p>
                <p className="text-sm text-slate-400 mb-6">or</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-pink-600 hover:bg-pink-700 text-white gap-2"
                  size="lg"
                >
                  <Upload className="w-4 h-4" />
                  Browse Files
                </Button>
              </div>
            </div>
          </div>

          {!fileData && (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-8">Try with sample data to see DataLens in action</p>
              <Button
                onClick={loadSampleData}
                size="lg"
                className="bg-pink-600 hover:bg-pink-700 text-white"
              >
                Load Sample Data
              </Button>
            </div>
          )}

          {fileData && (
            <>
              <div className="rounded-xl border border-slate-700/30 bg-slate-800/50 backdrop-blur-sm overflow-hidden mb-8">
                <div className="p-8 border-b border-slate-700/30 bg-slate-900/20">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-pink-400" />
                    File Preview
                  </h2>
                  <p className="text-xs text-slate-400 mt-2">First 10 rows of your dataset</p>
                </div>
                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">File Name</p>
                      <p className="text-white font-medium font-mono text-sm break-all">{fileData.name}</p>
                    </div>
                    <div className="bg-slate-900/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Dimensions</p>
                      <p className="text-white font-medium">{fileData.rows} rows × {fileData.columns} columns</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Columns</p>
                    <div className="flex flex-wrap gap-2">
                      {fileData.headers.map(header => (
                        <span
                          key={header}
                          className="px-3 py-2 bg-pink-500/10 border border-pink-500/30 rounded-full text-xs font-medium text-pink-300"
                        >
                          {header}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-700/30">
                          {fileData.headers.map(header => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left text-slate-300 font-semibold uppercase tracking-wider bg-slate-900/40"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fileData.preview.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                            {fileData.headers.map(header => (
                              <td key={`${idx}-${header}`} className="px-4 py-3 text-slate-300">
                                {row[header] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center mb-8">
                <Button
                  onClick={analyzeData}
                  disabled={loading}
                  className="bg-pink-600 hover:bg-pink-700 text-white gap-2 px-8"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Analyze Data
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetAnalysis}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white gap-2"
                  size="lg"
                >
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              </div>

              {loading && (
                <div className="rounded-xl border border-slate-700/30 bg-slate-800/50 backdrop-blur-sm p-12">
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-pink-400 animate-spin mb-4" />
                    <p className="text-white font-semibold mb-2 text-lg">Analyzing your data</p>
                    <p className="text-sm text-slate-400">Please wait while our AI processes your dataset...</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
