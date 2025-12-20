import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileText, X, FileCheck, ArrowRight, Info, Code2 } from 'lucide-react';
import { validateAndParseCSV, formatForDatabase, ParsedQuestion } from '@/lib/csvParser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CSVImportProps {
  type: 'aptitude' | 'technical' | 'gd';
  onImportComplete?: (count: number) => void;
  onCountsUpdated?: () => Promise<void>;
}

export const CSVImport: React.FC<CSVImportProps> = ({ type, onImportComplete, onCountsUpdated }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  const getTypeLabel = () => {
    switch (type) {
      case 'aptitude':
        return 'Aptitude';
      case 'technical':
        return 'Technical';
      case 'gd':
        return 'GD Topic';
    }
  };

  const getCsvTemplate = () => {
    switch (type) {
      case 'aptitude':
        return `category,level,question,option_a,option_b,option_c,option_d,correct_answer,explanation
Quantitative,1,What is 2+2?,3,4,5,6,1,Two plus two equals four
Logical Reasoning,2,If A=1 B=2 C=3... Z=26 then M=?,10,11,12,13,2,M is the 13th letter of alphabet
Verbal Ability,1,Select the correct spelling,Occassion,Occasion,Ocasion,Occassoin,1,Occasion is spelled with two c's and one s`;

      case 'technical':
        return `title,category,difficulty,level,description,solution,approach
Two Sum,Arrays,Easy,1,"Given an array of integers nums and an integer target, return indices of the two numbers.","return [i, j]","Use hash map to store values, O(n) time"
Reverse String,Strings,Easy,1,"Write a function that reverses a string","s = s[::-1]","Can use two pointers or built-in reverse"
Merge Sorted Arrays,Arrays,Medium,2,"Merge two sorted arrays without extra space","Use two pointers from end","Compare and place larger elements at the end"`;

      case 'gd':
        return `title,category,level,description,points_for,points_against,conclusion
AI in Healthcare,Technology,2,"Impact of artificial intelligence in healthcare sector","Improves diagnosis; Automates routine tasks; Reduces cost","Job displacement; Privacy concerns; Expensive setup","AI should be used as a tool to assist doctors, not replace them"
Remote Work,Business,1,"Should companies promote remote work?","Better work-life balance; No commute; Higher productivity","Team cohesion issues; Communication challenges; Isolation","Hybrid model combining office and remote work is optimal"`;
    }
  };

  const downloadTemplate = () => {
    const template = getCsvTemplate();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(template));
    element.setAttribute('download', `${type}_questions_template.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast({ title: 'Downloaded', description: `${getTypeLabel()} template downloaded` });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setParsedQuestions([]);
      setValidationErrors([]);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast({
        title: 'No File',
        description: 'Please select a CSV file first',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const fileContent = await file.text();
      setProgress(30);

      const result = validateAndParseCSV(fileContent, type);
      setProgress(60);

      setParsedQuestions(result.questions);
      setValidationErrors(result.errors);

      if (result.errors.length > 0) {
        toast({
          title: 'Validation Errors',
          description: `Found ${result.errors.length} error(s). Please review below.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Validation Successful',
          description: `All ${result.summary.valid} questions are valid and ready to import`,
          variant: 'default'
        });
      }

      setProgress(100);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedQuestions.length === 0) {
      toast({
        title: 'No Valid Questions',
        description: 'Please validate the CSV file first and fix any errors',
        variant: 'destructive'
      });
      return;
    }

    const validQuestions = parsedQuestions.filter(q => q.errors.length === 0);

    if (validQuestions.length === 0) {
      toast({
        title: 'No Valid Questions',
        description: 'All questions have errors. Please fix them before importing.',
        variant: 'destructive'
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Not Authenticated',
        description: 'You must be logged in to import questions',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setImportProgress({ current: 0, total: validQuestions.length });

    try {
      // Get the formatted data for database
      const questionsToInsert = formatForDatabase(validQuestions, user.id);

      // Batch insert questions (split into chunks of 50 to avoid payload limits)
      const chunkSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
        const chunk = questionsToInsert.slice(i, i + chunkSize);
        
        try {
          const { error } = await supabase
            .from(type === 'aptitude' ? 'aptitude_questions' : type === 'technical' ? 'technical_questions' : 'gd_topics')
            .insert(chunk);

          if (error) {
            console.error('Insert error:', error);
            errorCount += chunk.length;
          } else {
            successCount += chunk.length;
          }
        } catch (err) {
          console.error('Insert exception:', err);
          errorCount += chunk.length;
        }

        // Update progress for each question in the chunk
        for (let j = 0; j < chunk.length; j++) {
          setImportProgress({ 
            current: Math.min(i + j + 1, validQuestions.length), 
            total: validQuestions.length 
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${successCount} ${getTypeLabel()} question${successCount !== 1 ? 's' : ''}!`,
          variant: 'default'
        });

        // Refresh counts if callback provided
        if (onCountsUpdated) {
          await onCountsUpdated();
        }

        if (onImportComplete) {
          onImportComplete(successCount);
        }

        // Reset
        setFile(null);
        setParsedQuestions([]);
        setValidationErrors([]);
        setImportProgress(null);
      }

      if (errorCount > 0) {
        toast({
          title: 'Partial Import',
          description: `Imported ${successCount} questions, but ${errorCount} failed. Please check the errors.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: `Failed to import questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validCount = parsedQuestions.filter(q => q.errors.length === 0).length;
  const invalidCount = parsedQuestions.length - validCount;

  // Get Technical Round specific format info
  const getTechnicalFormatInfo = () => {
    if (type !== 'technical') return null;
    return {
      columns: ['title', 'category', 'difficulty', 'level', 'description', 'solution', 'approach'],
      categories: ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching'],
      difficulties: ['Easy', 'Medium', 'Hard'],
      levels: ['1', '2', '3', '4']
    };
  };

  const formatInfo = getTechnicalFormatInfo();

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-3 text-2xl">
          {type === 'technical' ? (
            <Code2 className="h-6 w-6 text-accent" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
          Bulk Import {getTypeLabel()} Questions
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Upload a CSV file to add multiple questions at once. Import up to 100 questions in seconds.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Step-by-Step Guide for Technical */}
        {type === 'technical' && (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <Info className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-3">Quick Start Guide</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Download Template</p>
                      <p className="text-xs text-muted-foreground">Get the correct CSV format</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Fill Your Data</p>
                      <p className="text-xs text-muted-foreground">Add your questions in Excel</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <p className="font-medium text-sm text-foreground">Upload & Import</p>
                      <p className="text-xs text-muted-foreground">Validate and import questions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Format Requirements - Technical Specific */}
        {type === 'technical' && formatInfo && (
          <Card className="bg-muted/30 border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-accent" />
                Required CSV Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">CSV Columns (in order):</p>
                <div className="flex flex-wrap gap-2">
                  {formatInfo.columns.map((col, idx) => (
                    <div key={col} className="flex items-center gap-2">
                      <span className="px-3 py-1.5 bg-accent/10 text-accent rounded-md text-xs font-mono font-semibold border border-accent/20">
                        {col}
                      </span>
                      {idx < formatInfo.columns.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">Valid Categories:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {formatInfo.categories.slice(0, 4).map(cat => (
                      <span key={cat} className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground">
                        {cat}
                      </span>
                    ))}
                    <span className="px-2 py-1 text-xs text-muted-foreground">+{formatInfo.categories.length - 4} more</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">Difficulty Levels:</p>
                  <div className="flex gap-1.5">
                    {formatInfo.difficulties.map(diff => (
                      <span key={diff} className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground">
                        {diff}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">Question Levels:</p>
                  <div className="flex gap-1.5">
                    {formatInfo.levels.map(lev => (
                      <span key={lev} className="px-2 py-1 bg-background border border-border rounded text-xs text-muted-foreground font-mono">
                        {lev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced File Upload Section */}
        <div className={`border-2 border-dashed rounded-xl p-8 transition-all ${
          file 
            ? 'border-accent bg-accent/5' 
            : 'border-border hover:border-accent/50 hover:bg-muted/30'
        }`}>
          <div className="flex flex-col items-center gap-6">
            {!file ? (
              <>
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-accent" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                    <Upload className="h-4 w-4 text-accent-foreground" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    Select Your CSV File
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {type === 'technical' 
                      ? 'Upload a CSV file containing your technical questions. Make sure it follows the format shown above.'
                      : 'Drop your CSV file here or click browse to select from your computer'
                    }
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    {file.name}
                  </p>
                  <p className="text-sm text-success font-medium">
                    File selected and ready to validate
                  </p>
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Button
                size="lg"
                variant={file ? "outline" : "default"}
                onClick={() => document.getElementById('csv-upload')?.click()}
                className="min-w-[140px]"
              >
                <Upload className="h-4 w-4 mr-2" />
                {file ? 'Change File' : 'Browse Files'}
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={downloadTemplate}
                className="min-w-[180px]"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              {file && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={() => {
                    setFile(null);
                    setParsedQuestions([]);
                    setValidationErrors([]);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive ml-2">
              <p className="font-medium mb-2">Validation Errors ({validationErrors.length}):</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {validationErrors.slice(0, 10).map((error, idx) => (
                  <p key={idx} className="text-sm">{error}</p>
                ))}
                {validationErrors.length > 10 && (
                  <p className="text-sm font-medium">... and {validationErrors.length - 10} more errors</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Enhanced Validation Summary */}
        {parsedQuestions.length > 0 && (
          <Card className="border-2 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Validation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-background border-2 border-border">
                  <p className="text-3xl font-bold text-foreground mb-1">{parsedQuestions.length}</p>
                  <p className="text-sm font-medium text-muted-foreground">Total Rows</p>
                  <p className="text-xs text-muted-foreground mt-1">Found in CSV file</p>
                </div>

                <div className="text-center p-4 rounded-lg bg-success/10 border-2 border-success/30">
                  <p className="text-3xl font-bold text-success mb-1">{validCount}</p>
                  <p className="text-sm font-medium text-success">Valid Questions</p>
                  <p className="text-xs text-success/70 mt-1">Ready to import</p>
                </div>

                <div className={`text-center p-4 rounded-lg border-2 ${
                  invalidCount > 0 
                    ? 'bg-destructive/10 border-destructive/30' 
                    : 'bg-background border-border'
                }`}>
                  <p className={`text-3xl font-bold mb-1 ${
                    invalidCount > 0 ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {invalidCount}
                  </p>
                  <p className={`text-sm font-medium ${
                    invalidCount > 0 ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    Invalid Questions
                  </p>
                  <p className={`text-xs mt-1 ${
                    invalidCount > 0 ? 'text-destructive/70' : 'text-muted-foreground'
                  }`}>
                    {invalidCount > 0 ? 'Check errors below' : 'No errors found'}
                  </p>
                </div>
              </div>

            {/* Import Progress Bar */}
            {importProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing...</span>
                  <span>{importProgress.current}/{importProgress.total}</span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            )}

            {/* Questions Preview */}
            {validCount > 0 && (
              <div className="bg-background border border-success/20 rounded-lg p-4">
                <p className="text-sm font-medium text-success flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to Import
                </p>
                <p className="text-sm text-muted-foreground">
                  {validCount} valid question{validCount !== 1 ? 's' : ''} will be imported.
                </p>
              </div>
            )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          {parsedQuestions.length === 0 && file && (
            <Button
              size="lg"
              onClick={handleValidate}
              disabled={isLoading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Validate CSV
                </>
              )}
            </Button>
          )}

          {validCount > 0 && (
            <Button
              size="lg"
              onClick={handleImport}
              disabled={isLoading}
              className="bg-success hover:bg-success/90 text-success-foreground min-w-[200px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {validCount} Question{validCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Enhanced Help Text */}
        <Card className="bg-muted/20 border-border">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <p className="font-semibold text-foreground">CSV Format Guidelines:</p>
                <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                  <li><strong className="text-foreground">Headers Required:</strong> First row must contain exact column headers as shown in the template</li>
                  <li><strong className="text-foreground">All Fields Required:</strong> Every required field must be filled (no empty cells)</li>
                  <li><strong className="text-foreground">Data Types:</strong> Use numbers for level (1-4), exact strings for category and difficulty</li>
                  <li><strong className="text-foreground">Quotes:</strong> Wrap text in quotes if it contains commas: <code className="bg-background px-1 py-0.5 rounded text-xs">"Text, with, commas"</code></li>
                  <li><strong className="text-foreground">Template:</strong> Always download the template first to ensure correct format</li>
                  <li><strong className="text-foreground">Limit:</strong> Maximum 100 questions per import for optimal performance</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default CSVImport;
