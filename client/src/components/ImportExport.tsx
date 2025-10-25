import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { swimStorage } from "@/lib/storage";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ImportExport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const handleExport = () => {
    try {
      const jsonData = swimStorage.exportData();
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `swim-times-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your swim times data has been exported.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = swimStorage.importData(text);
      setImportResult(result);

      if (result.imported > 0) {
        window.dispatchEvent(new Event('storage-updated'));
        toast({
          title: "Import successful",
          description: `Imported ${result.imported} swim times. ${result.skipped} skipped (duplicates).`,
        });
      } else if (result.errors.length > 0) {
        toast({
          title: "Import failed",
          description: result.errors[0] || "Failed to import data.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "No new data",
          description: "All swim times already exist in the database.",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to read the file. Please check the file format.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Import & Export</h1>
        <p className="text-muted-foreground">
          Backup and restore your swim times data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Download all your swim times as a JSON file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleExport}
              className="w-full"
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export to JSON
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import swim times from a JSON file. Data will be merged with existing entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              data-testid="input-file"
            />
            <Button
              onClick={handleImportClick}
              variant="outline"
              className="w-full"
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import from JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {importResult && (
        <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
          {importResult.errors.length > 0 ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-semibold">Import Results:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{importResult.imported} swim times imported</li>
                <li>{importResult.skipped} duplicates skipped</li>
                {importResult.errors.length > 0 && (
                  <li className="text-destructive">
                    {importResult.errors.length} errors occurred
                  </li>
                )}
              </ul>
              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">View errors</summary>
                  <ul className="mt-2 text-xs space-y-1">
                    {importResult.errors.map((error, i) => (
                      <li key={i} className="text-muted-foreground">
                        {error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About Import/Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Export:</strong> Creates a JSON file containing all your swim times data. 
            Use this to back up your data or transfer it to another device.
          </p>
          <p>
            <strong>Import:</strong> Loads swim times from a JSON file and merges them with your 
            existing data. Duplicate entries (same ID) will be skipped to prevent data loss.
          </p>
          <p>
            <strong>Data Safety:</strong> All data is stored locally in your browser. Regular 
            exports are recommended to prevent data loss.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
