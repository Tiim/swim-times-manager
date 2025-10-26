export interface SwimTime {
  id: string;
  athleteName: string;
  eventName: string;
  date: string;
  measuredTime: string;
  stroke: "Freestyle" | "Backstroke" | "Breaststroke" | "Butterfly" | "IM";
  distance: number;
  poolLength: "SCM" | "SCY" | "LCM" | "LCY";
  splits?: string | null;
  last_modified: string; // ISO date string
}

/**
 * Athlete metadata record
 * Maintains canonical names and aliases for merging
 */
export interface Athlete {
  id: string;  // UUID
  canonicalName: string;  // The official name used in all SwimTime records
  aliases: string[];  // Alternative spellings/names that map to this athlete
  createdAt: string;  // ISO datetime
  updatedAt: string;  // ISO datetime
  metadata?: {
    team?: string;
    birthYear?: number;
    notes?: string;
  };
}

/**
 * Updated storage container
 */
interface StoredData {
  athletes: Athlete[];
  swimTimes: SwimTime[];
  version: number;
}

/**
 * Statistics returned by getAthletes()
 */
export interface AthleteStats {
  name: string;
  aliases: string[];
  totalTimes: number;
  personalBests: SwimTime[];
  recentTimes: SwimTime[];
}

/**
 * Potential duplicate athlete pair
 */
export interface DuplicateCandidate {
  athlete1: string;
  athlete2: string;
  similarity: number;  // 0.0 to 1.0
  timesCount1: number;
  timesCount2: number;
}

/**
 * Import conflict when alias maps to different names
 */
export interface AliasConflict {
  alias: string;
  localCanonical: string;
  importedCanonical: string;
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  skipped: number;
  athletesImported: number;
  conflicts: AliasConflict[];
  duplicateSuggestions: DuplicateCandidate[];
  errors: string[];
}

const STORAGE_KEY = "swim-times-data";

// Helper function to convert time string to seconds for comparison
function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    // Format: MM:SS.ss
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  } else {
    // Format: SS.ss
    return parseFloat(timeStr);
  }
}

class LocalSwimStorage {
  /**
   * Get stored data with automatic migration from v1 to v2
   */
  private getData(): StoredData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return {
          athletes: [],
          swimTimes: [],
          version: 2
        };
      }

      const data = JSON.parse(stored);

      // Migration from version 1 (array format) to version 2 (object format)
      if (Array.isArray(data)) {
        console.log('Migrating data from array format to version 2...');

        // Old format was just an array of swim times
        const swimTimes = data;

        // Add last_modified to existing records that don't have it
        const migratedTimes = swimTimes.map((time: any) => ({
          ...time,
          last_modified: time.last_modified || time.date || new Date().toISOString()
        }));

        // Create athletes array from unique swim time names
        const athleteNames = new Set<string>();
        migratedTimes.forEach((time: SwimTime) => {
          athleteNames.add(time.athleteName);
        });

        const athletes = Array.from(athleteNames).map(name => ({
          id: crypto.randomUUID(),
          canonicalName: name,
          aliases: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        const migratedData: StoredData = {
          athletes,
          swimTimes: migratedTimes,
          version: 2
        };

        // Save migrated data
        this.saveData(migratedData);
        console.log(`Migration complete. Created ${athletes.length} athlete records.`);
        return migratedData;
      }

      // Migration from version 1 (object without athletes) to version 2
      if (data.version === 1 || (!data.version && data.time_entries)) {
        console.log('Migrating data from version 1 to version 2...');

        const swimTimes = data.time_entries || data.swimTimes || [];

        // Add last_modified to existing records that don't have it
        const migratedTimes = swimTimes.map((time: any) => ({
          ...time,
          last_modified: time.last_modified || time.date || new Date().toISOString()
        }));

        // Create athletes array from unique swim time names
        const athleteNames = new Set<string>();
        migratedTimes.forEach((time: SwimTime) => {
          athleteNames.add(time.athleteName);
        });

        const athletes = Array.from(athleteNames).map(name => ({
          id: crypto.randomUUID(),
          canonicalName: name,
          aliases: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

        const migratedData: StoredData = {
          athletes,
          swimTimes: migratedTimes,
          version: 2
        };

        this.saveData(migratedData);
        console.log(`Migration complete. Created ${athletes.length} athlete records.`);
        return migratedData;
      }

      // Already version 2
      return data as StoredData;
    } catch (error) {
      console.error("Failed to load data from storage:", error);
      return {
        athletes: [],
        swimTimes: [],
        version: 2
      };
    }
  }

  /**
   * Save data to localStorage
   */
  private saveData(data: StoredData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save data to storage:", error);
    }
  }

  /**
   * Get athlete record by canonical name
   */
  getAthlete(name: string): Athlete | undefined {
    const data = this.getData();
    return data.athletes.find(a => a.canonicalName === name);
  }

  /**
   * Get all athlete records
   */
  getAllAthletes(): Athlete[] {
    const data = this.getData();
    return [...data.athletes].sort((a, b) =>
      a.canonicalName.localeCompare(b.canonicalName)
    );
  }

  /**
   * Ensure an athlete record exists, create if needed
   */
  private ensureAthleteExists(name: string): void {
    const data = this.getData();
    const exists = data.athletes.some(a => a.canonicalName === name);

    if (!exists) {
      const newAthlete: Athlete = {
        id: crypto.randomUUID(),
        canonicalName: name,
        aliases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.athletes.push(newAthlete);
      this.saveData(data);
    }
  }

  /**
   * Resolve any name (canonical or alias) to its canonical form
   */
  resolveAthleteName(name: string): string {
    const data = this.getData();

    // Check if it's already a canonical name
    const canonical = data.athletes.find(a => a.canonicalName === name);
    if (canonical) return name;

    // Check if it's an alias
    const owner = data.athletes.find(a => a.aliases.includes(name));
    if (owner) return owner.canonicalName;

    // Unknown name - return as-is (will be created on ensureAthleteExists)
    return name;
  }

  /**
   * Merge one athlete into another
   */
  mergeAthletes(fromName: string, toName: string): void {
    const data = this.getData();

    // Resolve both names to canonical forms
    const resolvedFrom = this.resolveAthleteName(fromName);
    const resolvedTo = this.resolveAthleteName(toName);

    // Validation
    if (resolvedFrom === resolvedTo) {
      throw new Error('Cannot merge athlete with itself');
    }

    // Find athlete records
    const fromAthlete = data.athletes.find(a => a.canonicalName === resolvedFrom);
    const toAthlete = data.athletes.find(a => a.canonicalName === resolvedTo);

    if (!fromAthlete) {
      throw new Error(`Source athlete not found: ${resolvedFrom}`);
    }
    if (!toAthlete) {
      throw new Error(`Target athlete not found: ${resolvedTo}`);
    }

    // 1. Update all swim times from old name to new name
    data.swimTimes.forEach(time => {
      if (time.athleteName === resolvedFrom) {
        time.athleteName = resolvedTo;
      }
    });

    // 2. Merge aliases
    if (!toAthlete.aliases.includes(resolvedFrom)) {
      toAthlete.aliases.push(resolvedFrom);
    }
    fromAthlete.aliases.forEach(alias => {
      if (!toAthlete.aliases.includes(alias)) {
        toAthlete.aliases.push(alias);
      }
    });

    // 3. Update any other athlete's aliases that pointed to the old name
    data.athletes.forEach(athlete => {
      if (athlete.id !== toAthlete.id) {
        athlete.aliases = athlete.aliases.map(alias =>
          alias === resolvedFrom ? resolvedTo : alias
        );
      }
    });

    // 4. Remove the source athlete record
    data.athletes = data.athletes.filter(a => a.id !== fromAthlete.id);

    // 5. Update timestamp
    toAthlete.updatedAt = new Date().toISOString();

    this.saveData(data);
    window.dispatchEvent(new Event('storage-updated'));
  }

  /**
   * Merge athletes and set a specific final canonical name
   * This allows choosing any name (canonical or alias) as the final name
   */
  mergeAthletesWithFinalName(fromName: string, toName: string, finalCanonicalName: string): void {
    // First, merge the athletes
    this.mergeAthletes(fromName, toName);

    // Then rename to the desired final name if different
    const resolvedTo = this.resolveAthleteName(toName);
    if (resolvedTo !== finalCanonicalName) {
      this.renameAthleteCanonical(resolvedTo, finalCanonicalName);
    }
  }

  /**
   * Rename an athlete's canonical name to one of their aliases (or current name)
   */
  renameAthleteCanonical(currentCanonicalName: string, newCanonicalName: string): void {
    const data = this.getData();

    const athlete = data.athletes.find(a => a.canonicalName === currentCanonicalName);
    if (!athlete) {
      throw new Error(`Athlete not found: ${currentCanonicalName}`);
    }

    // Check that the new name is either the current canonical name or one of the aliases
    if (newCanonicalName !== currentCanonicalName && !athlete.aliases.includes(newCanonicalName)) {
      throw new Error(`"${newCanonicalName}" is not a known name or alias for this athlete`);
    }

    if (newCanonicalName === currentCanonicalName) {
      // No change needed
      return;
    }

    // Update all swim times to use the new canonical name
    data.swimTimes.forEach(time => {
      if (time.athleteName === currentCanonicalName) {
        time.athleteName = newCanonicalName;
      }
    });

    // Move old canonical name to aliases, remove new name from aliases
    athlete.aliases = athlete.aliases.filter(a => a !== newCanonicalName);
    athlete.aliases.push(currentCanonicalName);
    athlete.canonicalName = newCanonicalName;
    athlete.updatedAt = new Date().toISOString();

    this.saveData(data);
    window.dispatchEvent(new Event('storage-updated'));
  }

  /**
   * Unmerge an alias from an athlete
   */
  unmergeAlias(alias: string): void {
    const data = this.getData();

    // Find the athlete that owns this alias
    const owner = data.athletes.find(a => a.aliases.includes(alias));
    if (!owner) {
      throw new Error(`Alias not found: ${alias}`);
    }

    // Remove the alias
    owner.aliases = owner.aliases.filter(a => a !== alias);
    owner.updatedAt = new Date().toISOString();

    // Create new athlete record for the former alias
    const newAthlete: Athlete = {
      id: crypto.randomUUID(),
      canonicalName: alias,
      aliases: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.athletes.push(newAthlete);

    this.saveData(data);
    window.dispatchEvent(new Event('storage-updated'));
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str1.length][str2.length];
  }

  /**
   * Calculate similarity between two names using Levenshtein distance
   */
  private calculateNameSimilarity(str1: string, str2: string): number {
    const normalize = (s: string) =>
      s.toLowerCase()
       .trim()
       .replace(/\s+/g, ' ')
       .replace(/[^\w\s]/g, '');

    const a = normalize(str1);
    const b = normalize(str2);

    if (a === b) return 1.0;

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    let similarity = 1 - (distance / maxLength);

    const partsA = a.split(' ');
    const partsB = b.split(' ');

    if (partsA.length > 1 && partsB.length > 1) {
      if (partsA[0] === partsB[0]) {
        similarity = Math.min(1.0, similarity + 0.15);
      }
      if (partsA[partsA.length - 1] === partsB[partsB.length - 1]) {
        similarity = Math.min(1.0, similarity + 0.15);
      }
    }

    return similarity;
  }

  /**
   * Find potential duplicate athletes using string similarity
   */
  findPotentialDuplicates(threshold: number = 0.85): DuplicateCandidate[] {
    const data = this.getData();
    const athletes = data.athletes.map(a => a.canonicalName);
    const duplicates: DuplicateCandidate[] = [];

    for (let i = 0; i < athletes.length; i++) {
      for (let j = i + 1; j < athletes.length; j++) {
        const name1 = athletes[i];
        const name2 = athletes[j];
        const similarity = this.calculateNameSimilarity(name1, name2);

        if (similarity >= threshold) {
          duplicates.push({
            athlete1: name1,
            athlete2: name2,
            similarity,
            timesCount1: data.swimTimes.filter(t => t.athleteName === name1).length,
            timesCount2: data.swimTimes.filter(t => t.athleteName === name2).length
          });
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  getAllSwimTimes(): SwimTime[] {
    const data = this.getData();
    return [...data.swimTimes].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getSwimTimeById(id: string): SwimTime | undefined {
    const data = this.getData();
    return data.swimTimes.find(time => time.id === id);
  }

  getSwimTimesByAthlete(athleteName: string): SwimTime[] {
    const data = this.getData();
    const resolvedName = this.resolveAthleteName(athleteName);
    return data.swimTimes
      .filter(time => time.athleteName === resolvedName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  createSwimTime(swimTime: Omit<SwimTime, "id" | "last_modified">): SwimTime {
    const resolvedName = this.resolveAthleteName(swimTime.athleteName);
    this.ensureAthleteExists(resolvedName);

    const newTime: SwimTime = {
      ...swimTime,
      athleteName: resolvedName,
      id: crypto.randomUUID(),
      splits: swimTime.splits || null,
      last_modified: new Date().toISOString(),
    };

    const data = this.getData();
    data.swimTimes.push(newTime);
    this.saveData(data);

    window.dispatchEvent(new Event('storage-updated'));
    return newTime;
  }

  updateSwimTime(id: string, updates: Partial<Omit<SwimTime, "id" | "last_modified">>): SwimTime | undefined {
    const data = this.getData();
    const index = data.swimTimes.findIndex(time => time.id === id);

    if (index === -1) {
      return undefined;
    }

    if (updates.athleteName) {
      updates.athleteName = this.resolveAthleteName(updates.athleteName);
      this.ensureAthleteExists(updates.athleteName);
    }

    data.swimTimes[index] = {
      ...data.swimTimes[index],
      ...updates,
      last_modified: new Date().toISOString()
    };

    this.saveData(data);
    window.dispatchEvent(new Event('storage-updated'));
    return data.swimTimes[index];
  }

  deleteSwimTime(id: string): boolean {
    const data = this.getData();
    const initialLength = data.swimTimes.length;
    data.swimTimes = data.swimTimes.filter(time => time.id !== id);

    if (data.swimTimes.length === initialLength) {
      return false;
    }

    this.saveData(data);
    window.dispatchEvent(new Event('storage-updated'));
    return true;
  }

  getPersonalBests(): SwimTime[] {
    const data = this.getData();
    const pbMap = new Map<string, SwimTime>();

    for (const time of data.swimTimes) {
      const key = `${time.athleteName}-${time.stroke}-${time.distance}-${time.poolLength}`;
      const existing = pbMap.get(key);

      if (!existing || timeToSeconds(time.measuredTime) < timeToSeconds(existing.measuredTime)) {
        pbMap.set(key, time);
      }
    }

    return Array.from(pbMap.values());
  }

  getAthletes(): AthleteStats[] {
    const data = this.getData();
    const athleteMap = new Map<string, AthleteStats>();

    // Initialize from athlete records
    data.athletes.forEach(athlete => {
      athleteMap.set(athlete.canonicalName, {
        name: athlete.canonicalName,
        aliases: [...athlete.aliases],
        totalTimes: 0,
        personalBests: [],
        recentTimes: []
      });
    });

    // Populate with swim data
    for (const athlete of data.athletes) {
      const stats = athleteMap.get(athlete.canonicalName)!;
      const athleteTimes = this.getSwimTimesByAthlete(athlete.canonicalName);
      const pbs = this.getPersonalBestsForAthlete(athlete.canonicalName);

      stats.totalTimes = athleteTimes.length;
      stats.personalBests = pbs;
      stats.recentTimes = athleteTimes.slice(0, 10);
    }

    return Array.from(athleteMap.values());
  }

  getPersonalBestsForAthlete(athleteName: string): SwimTime[] {
    const times = this.getSwimTimesByAthlete(athleteName);
    const pbMap = new Map<string, SwimTime>();

    for (const time of times) {
      const key = `${time.stroke}-${time.distance}-${time.poolLength}`;
      const existing = pbMap.get(key);

      if (!existing || timeToSeconds(time.measuredTime) < timeToSeconds(existing.measuredTime)) {
        pbMap.set(key, time);
      }
    }

    return Array.from(pbMap.values());
  }

  exportData(): string {
    const data = this.getData();
    return JSON.stringify({
      version: data.version,
      exportedAt: new Date().toISOString(),
      athletes: data.athletes,
      time_entries: data.swimTimes
    }, null, 2);
  }

  importData(jsonData: string): ImportResult {
    const result: ImportResult = {
      success: true,
      imported: 0,
      updated: 0,
      skipped: 0,
      athletesImported: 0,
      conflicts: [],
      duplicateSuggestions: [],
      errors: []
    };

    try {
      const parsed = JSON.parse(jsonData);
      const data = this.getData();

      // Import athletes first
      if (parsed.athletes && Array.isArray(parsed.athletes)) {
        parsed.athletes.forEach((importedAthlete: Athlete) => {
          const existing = data.athletes.find(
            a => a.canonicalName === importedAthlete.canonicalName
          );

          if (existing) {
            // Merge aliases
            importedAthlete.aliases.forEach((alias: string) => {
              const conflictOwner = data.athletes.find(
                a => a.id !== existing.id && a.aliases.includes(alias)
              );

              if (conflictOwner) {
                result.conflicts.push({
                  alias,
                  localCanonical: conflictOwner.canonicalName,
                  importedCanonical: importedAthlete.canonicalName
                });
              } else if (!existing.aliases.includes(alias)) {
                existing.aliases.push(alias);
              }
            });
            existing.updatedAt = new Date().toISOString();
          } else {
            data.athletes.push({
              ...importedAthlete,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            result.athletesImported++;
          }
        });
      }

      // Import swim times
      let importedTimes: any[];
      if (Array.isArray(parsed)) {
        importedTimes = parsed;
      } else if (parsed.time_entries && Array.isArray(parsed.time_entries)) {
        importedTimes = parsed.time_entries;
      } else if (parsed.swimTimes && Array.isArray(parsed.swimTimes)) {
        importedTimes = parsed.swimTimes;
      } else {
        result.errors.push("Invalid data format: expected time_entries or swimTimes array");
        result.success = false;
        return result;
      }

      const existingMap = new Map(data.swimTimes.map(t => [t.id, t]));

      for (const time of importedTimes) {
        if (!time.athleteName || !time.eventName || !time.date ||
            !time.measuredTime || !time.stroke || !time.distance || !time.poolLength) {
          result.errors.push(`Skipped invalid entry: ${JSON.stringify(time)}`);
          result.skipped++;
          continue;
        }

        const resolvedName = this.resolveAthleteName(time.athleteName);
        this.ensureAthleteExists(resolvedName);

        const importedLastModified = time.last_modified || time.date || new Date().toISOString();

        if (time.id && existingMap.has(time.id)) {
          const existing = existingMap.get(time.id)!;
          const existingLastModified = existing.last_modified || existing.date;

          if (new Date(importedLastModified) > new Date(existingLastModified)) {
            const updatedTime: SwimTime = {
              ...time,
              athleteName: resolvedName,
              id: time.id,
              splits: time.splits || null,
              last_modified: importedLastModified,
            };
            existingMap.set(time.id, updatedTime);
            result.updated++;
          } else {
            result.skipped++;
          }
          continue;
        }

        const newTime: SwimTime = {
          ...time,
          athleteName: resolvedName,
          id: time.id || crypto.randomUUID(),
          splits: time.splits || null,
          last_modified: importedLastModified,
        };

        existingMap.set(newTime.id, newTime);
        result.imported++;
      }

      data.swimTimes = Array.from(existingMap.values());
      this.saveData(data);

      result.duplicateSuggestions = this.findPotentialDuplicates(0.85);
      result.success = result.conflicts.length === 0;

      window.dispatchEvent(new Event('storage-updated'));
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error}`);
      result.success = false;
    }

    return result;
  }

  clearAll(): void {
    this.saveData({
      athletes: [],
      swimTimes: [],
      version: 2
    });
    window.dispatchEvent(new Event('storage-updated'));
  }
}

export const swimStorage = new LocalSwimStorage();
