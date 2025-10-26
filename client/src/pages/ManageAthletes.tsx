import { useState, useEffect } from 'react';
import { swimStorage, AthleteStats, DuplicateCandidate } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Merge, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MergeDialog } from '@/components/MergeDialog';

export default function ManageAthletes() {
  const [athletes, setAthletes] = useState<AthleteStats[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeSourceAthlete, setMergeSourceAthlete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('storage-updated', handleUpdate);
    return () => window.removeEventListener('storage-updated', handleUpdate);
  }, []);

  const loadData = () => {
    setAthletes(swimStorage.getAthletes());
    setDuplicates(swimStorage.findPotentialDuplicates(0.85));
  };

  const handleMerge = (from: string, to: string, finalCanonicalName: string) => {
    try {
      swimStorage.mergeAthletesWithFinalName(from, to, finalCanonicalName);
      loadData();
      setMergeDialogOpen(false);
      setMergeSourceAthlete(null);
      toast({
        title: "Athletes merged",
        description: `Successfully merged athletes. Final name: "${finalCanonicalName}"`,
      });
    } catch (error) {
      console.error('Merge failed:', error);
      toast({
        title: "Merge failed",
        description: error instanceof Error ? error.message : 'Merge failed',
        variant: "destructive"
      });
    }
  };

  const handleUnmerge = (alias: string) => {
    try {
      swimStorage.unmergeAlias(alias);
      loadData();
      toast({
        title: "Alias unmerged",
        description: `"${alias}" is now an independent athlete`,
      });
    } catch (error) {
      console.error('Unmerge failed:', error);
      toast({
        title: "Unmerge failed",
        description: error instanceof Error ? error.message : 'Unmerge failed',
        variant: "destructive"
      });
    }
  };

  const openMergeDialog = (athleteName: string) => {
    setMergeSourceAthlete(athleteName);
    setMergeDialogOpen(true);
  };

  const closeMergeDialog = () => {
    setMergeDialogOpen(false);
    setMergeSourceAthlete(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Manage Athletes</h1>
      </div>

      {/* Duplicate Suggestions */}
      {duplicates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Potential Duplicates ({duplicates.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duplicates.map((dup, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium">{dup.athlete1}</span>
                      <span className="text-muted-foreground text-sm">({dup.timesCount1} times)</span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-medium">{dup.athlete2}</span>
                      <span className="text-muted-foreground text-sm">({dup.timesCount2} times)</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {Math.round(dup.similarity * 100)}% similar
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openMergeDialog(dup.athlete1)}
                  >
                    <Merge className="h-4 w-4 mr-1" />
                    Merge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Athletes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Athletes ({athletes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead className="text-right">Total Swims</TableHead>
                  <TableHead className="text-right">Personal Bests</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athletes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No athletes found. Add some swim times to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  athletes.map((athlete) => (
                    <TableRow key={athlete.name}>
                      <TableCell className="font-medium">{athlete.name}</TableCell>
                      <TableCell>
                        {athlete.aliases.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {athlete.aliases.map((alias) => (
                              <Badge
                                key={alias}
                                variant="secondary"
                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors group"
                                onClick={() => {
                                  if (confirm(`Unmerge "${alias}"? This will create a new athlete with no swim times.`)) {
                                    handleUnmerge(alias);
                                  }
                                }}
                                title="Click to unmerge"
                              >
                                {alias}
                                <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{athlete.totalTimes}</TableCell>
                      <TableCell className="text-right tabular-nums">{athlete.personalBests.length}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMergeDialog(athlete.name)}
                        >
                          <Merge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Merge Dialog */}
      {mergeDialogOpen && mergeSourceAthlete && (
        <MergeDialog
          sourceAthlete={mergeSourceAthlete}
          onClose={closeMergeDialog}
          onConfirm={handleMerge}
        />
      )}
    </div>
  );
}
