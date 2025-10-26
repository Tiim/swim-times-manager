import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Search, X, Merge, AlertCircle } from 'lucide-react';
import { swimStorage, AthleteStats } from '@/lib/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MergeDialogProps {
  sourceAthlete: string;
  onClose: () => void;
  onConfirm: (fromName: string, toName: string, finalCanonicalName: string) => void;
}

export function MergeDialog({ sourceAthlete, onClose, onConfirm }: MergeDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [selectedFinalName, setSelectedFinalName] = useState<string>('');

  const athletes = useMemo(() => {
    return swimStorage.getAthletes().filter(a => a.name !== sourceAthlete);
  }, [sourceAthlete]);

  const sourceAthleteData = useMemo(() => {
    return swimStorage.getAthletes().find(a => a.name === sourceAthlete);
  }, [sourceAthlete]);

  const targetAthleteData = useMemo(() => {
    return selectedTarget ? athletes.find(a => a.name === selectedTarget) : null;
  }, [selectedTarget, athletes]);

  const filteredAthletes = useMemo(() => {
    if (!searchQuery.trim()) return athletes;

    const query = searchQuery.toLowerCase();
    return athletes.filter(athlete => {
      // Search in canonical name
      if (athlete.name.toLowerCase().includes(query)) return true;
      // Search in aliases
      if (athlete.aliases.some(alias => alias.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [athletes, searchQuery]);

  const allPossibleNames = useMemo(() => {
    if (!sourceAthleteData || !targetAthleteData) return [];

    const names = new Set<string>();

    // Add source canonical name and aliases
    names.add(sourceAthleteData.name);
    sourceAthleteData.aliases.forEach(alias => names.add(alias));

    // Add target canonical name and aliases
    names.add(targetAthleteData.name);
    targetAthleteData.aliases.forEach(alias => names.add(alias));

    return Array.from(names).sort();
  }, [sourceAthleteData, targetAthleteData]);

  const handleSelectTarget = (athleteName: string) => {
    setSelectedTarget(athleteName);
    // Default to target's canonical name
    setSelectedFinalName(athleteName);
  };

  const handleConfirm = () => {
    if (!selectedTarget || !selectedFinalName) return;

    // Determine merge direction based on which athlete owns the final name
    const targetOwnsName = targetAthleteData?.name === selectedFinalName ||
                           targetAthleteData?.aliases.includes(selectedFinalName);

    if (targetOwnsName) {
      // Merge source into target, then rename target if needed
      onConfirm(sourceAthlete, selectedTarget, selectedFinalName);
    } else {
      // The selected final name belongs to source, so merge target into source
      onConfirm(selectedTarget, sourceAthlete, selectedFinalName);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
          <CardTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Merge Athletes
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source Athlete Info */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Merging:</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{sourceAthlete}</div>
              {sourceAthleteData && sourceAthleteData.aliases.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {sourceAthleteData.aliases.map(alias => (
                    <Badge key={alias} variant="secondary" className="text-xs">
                      {alias}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {sourceAthleteData?.totalTimes} swim times
              </div>
            </div>
          </div>

          {/* Target Selection */}
          {!selectedTarget ? (
            <div>
              <Label className="text-sm font-medium mb-2 block">Merge into:</Label>

              {/* Search Box */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search athletes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Athletes List */}
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                {filteredAthletes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchQuery ? 'No athletes found' : 'No other athletes available'}
                  </div>
                ) : (
                  filteredAthletes.map((athlete) => (
                    <button
                      key={athlete.name}
                      onClick={() => handleSelectTarget(athlete.name)}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors border border-transparent hover:border-border"
                    >
                      <div className="font-medium">{athlete.name}</div>
                      {athlete.aliases.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {athlete.aliases.map(alias => (
                            <Badge key={alias} variant="secondary" className="text-xs">
                              {alias}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {athlete.totalTimes} swim times
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Selected Target Info */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Into:</Label>
                <div className="p-3 bg-muted rounded-lg relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTarget(null);
                      setSelectedFinalName('');
                    }}
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="font-medium">{selectedTarget}</div>
                  {targetAthleteData && targetAthleteData.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {targetAthleteData.aliases.map(alias => (
                        <Badge key={alias} variant="secondary" className="text-xs">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    {targetAthleteData?.totalTimes} swim times
                  </div>
                </div>
              </div>

              {/* Final Name Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Choose the final name to keep:
                </Label>
                <RadioGroup value={selectedFinalName} onValueChange={setSelectedFinalName}>
                  <div className="space-y-2 border rounded-lg p-3">
                    {allPossibleNames.map((name) => {
                      const isSourceCanonical = name === sourceAthleteData?.name;
                      const isTargetCanonical = name === targetAthleteData?.name;
                      const isSourceAlias = sourceAthleteData?.aliases.includes(name);
                      const isTargetAlias = targetAthleteData?.aliases.includes(name);

                      return (
                        <div key={name} className="flex items-center space-x-2">
                          <RadioGroupItem value={name} id={`name-${name}`} />
                          <Label
                            htmlFor={`name-${name}`}
                            className="flex-1 cursor-pointer flex items-center gap-2"
                          >
                            <span className="font-medium">{name}</span>
                            {isSourceCanonical && (
                              <Badge variant="outline" className="text-xs">
                                {sourceAthlete}'s current name
                              </Badge>
                            )}
                            {isTargetCanonical && (
                              <Badge variant="outline" className="text-xs">
                                {selectedTarget}'s current name
                              </Badge>
                            )}
                            {isSourceAlias && (
                              <Badge variant="secondary" className="text-xs">
                                {sourceAthlete}'s alias
                              </Badge>
                            )}
                            {isTargetAlias && (
                              <Badge variant="secondary" className="text-xs">
                                {selectedTarget}'s alias
                              </Badge>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </RadioGroup>
              </div>

              {/* Preview */}
              {selectedFinalName && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="text-sm">
                      <p className="font-semibold mb-1">This will:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Combine all swim times under <strong>{selectedFinalName}</strong></li>
                        <li>
                          Other names will become aliases:{' '}
                          {allPossibleNames
                            .filter(n => n !== selectedFinalName)
                            .join(', ')}
                        </li>
                        <li>
                          Total: {(sourceAthleteData?.totalTimes || 0) + (targetAthleteData?.totalTimes || 0)} swim times
                        </li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>

        {/* Footer Actions */}
        <div className="border-t p-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTarget || !selectedFinalName}
          >
            <Merge className="h-4 w-4 mr-2" />
            Confirm Merge
          </Button>
        </div>
      </Card>
    </div>
  );
}
