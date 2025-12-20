import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileText, X } from 'lucide-react';
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import {getTypeLabel()} Questions
        </CardTitle>
        <CardDescription>
          Upload a CSV file to add multiple questions at once
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="border-2 border-dashed border-border rounded-lg p-6">
          <div className="flex flex-col items-center gap-4">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-foreground mb-1">
                {file ? file.name : 'Select CSV file'}
              </p>
              <p className="text-sm text-muted-foreground">
                {file ? 'Ready to validate' : 'Drop file or click to browse'}
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                Browse Files
              </Button>

              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>

              {file && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    setParsedQuestions([]);
                    setValidationErrors([]);
                  }}
                >
                  <X className="h-4 w-4" />
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

        {/* Validation Summary */}
        {parsedQuestions.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Import Summary</h3>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-foreground">{parsedQuestions.length}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>

              <div className="text-center p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-2xl font-bold text-success">{validCount}</p>
                <p className="text-xs text-muted-foreground">Valid</p>
              </div>

              <div className={`text-center p-3 rounded-lg ${invalidCount > 0 ? 'bg-destructive/5 border border-destructive/20' : 'bg-background'}`}>
                <p className={`text-2xl font-bold ${invalidCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {invalidCount}
                </p>
                <p className="text-xs text-muted-foreground">Invalid</p>
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
              <div className="bg-background border border-success/20 rounded p-3">
                <p className="text-sm font-medium text-success flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to Import
                </p>
                <p className="text-sm text-muted-foreground">
                  {validCount} valid question{validCount !== 1 ? 's' : ''} will be imported.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {parsedQuestions.length === 0 && file && (
            <Button
              onClick={handleValidate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                'Validate CSV'
              )}
            </Button>
          )}

          {validCount > 0 && (
            <Button
              onClick={handleImport}
              disabled={isLoading}
              className="bg-success hover:bg-success/90"
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

        {/* Help Text */}
        <div className="bg-background border border-border rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">CSV Format Guidelines:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>First row must contain column headers</li>
            <li>All required fields must be filled</li>
            <li>Use correct data types (numbers for level, etc.)</li>
            <li>Download the template above for the exact format</li>
            <li>Maximum 100 questions per import (for performance)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVImport;
