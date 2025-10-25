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
  private getAll(): SwimTime[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];

      const times = JSON.parse(data);

      // Migration: add last_modified to existing records that don't have it
      let needsSave = false;
      const migratedTimes = times.map((time: any) => {
        if (!time.last_modified) {
          needsSave = true;
          return {
            ...time,
            last_modified: time.date || new Date().toISOString()
          };
        }
        return time;
      });

      // Save migrated data back to storage if needed
      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedTimes));
      }

      return migratedTimes;
    } catch (error) {
      console.error("Failed to load swim times from storage:", error);
      return [];
    }
  }

  private save(times: SwimTime[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
    } catch (error) {
      console.error("Failed to save swim times to storage:", error);
    }
  }

  getAllSwimTimes(): SwimTime[] {
    return this.getAll().sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  getSwimTimeById(id: string): SwimTime | undefined {
    return this.getAll().find(time => time.id === id);
  }

  getSwimTimesByAthlete(athleteName: string): SwimTime[] {
    return this.getAll()
      .filter(time => time.athleteName === athleteName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  createSwimTime(swimTime: Omit<SwimTime, "id" | "last_modified">): SwimTime {
    const newTime: SwimTime = {
      ...swimTime,
      id: crypto.randomUUID(),
      splits: swimTime.splits || null,
      last_modified: new Date().toISOString(),
    };
    const times = this.getAll();
    times.push(newTime);
    this.save(times);
    return newTime;
  }

  updateSwimTime(id: string, updates: Partial<Omit<SwimTime, "id" | "last_modified">>): SwimTime | undefined {
    const times = this.getAll();
    const index = times.findIndex(time => time.id === id);
    if (index === -1) {
      return undefined;
    }
    times[index] = {
      ...times[index],
      ...updates,
      last_modified: new Date().toISOString()
    };
    this.save(times);
    return times[index];
  }

  deleteSwimTime(id: string): boolean {
    const times = this.getAll();
    const filtered = times.filter(time => time.id !== id);
    if (filtered.length === times.length) {
      return false;
    }
    this.save(filtered);
    return true;
  }

  // Calculate personal bests from all swim times
  getPersonalBests(): SwimTime[] {
    const times = this.getAll();
    const pbMap = new Map<string, SwimTime>();

    for (const time of times) {
      const key = `${time.athleteName}-${time.stroke}-${time.distance}-${time.poolLength}`;
      const existing = pbMap.get(key);

      if (!existing || timeToSeconds(time.measuredTime) < timeToSeconds(existing.measuredTime)) {
        pbMap.set(key, time);
      }
    }

    return Array.from(pbMap.values());
  }

  // Get all unique athletes with their statistics
  getAthletes() {
    const times = this.getAll();
    const athleteMap = new Map<string, {
      name: string;
      totalTimes: number;
      personalBests: SwimTime[];
      recentTimes: SwimTime[];
    }>();

    for (const time of times) {
      if (!athleteMap.has(time.athleteName)) {
        const athleteTimes = this.getSwimTimesByAthlete(time.athleteName);
        const pbs = this.getPersonalBestsForAthlete(time.athleteName);
        
        athleteMap.set(time.athleteName, {
          name: time.athleteName,
          totalTimes: athleteTimes.length,
          personalBests: pbs,
          recentTimes: athleteTimes.slice(0, 10),
        });
      }
    }

    return Array.from(athleteMap.values());
  }

  // Get personal bests for specific athlete
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

  // Export all data as JSON
  exportData(): string {
    const times = this.getAll();
    return JSON.stringify({
      version: 1,
      time_entries: times
    }, null, 2);
  }

  // Import data from JSON, merging with existing data based on last_modified timestamps
  importData(jsonData: string): { imported: number; updated: number; skipped: number; errors: string[] } {
    const result = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

    try {
      const parsed = JSON.parse(jsonData);
      let importedTimes: any[];

      // Support both new format (object with version and time_entries) and legacy format (array)
      if (Array.isArray(parsed)) {
        // Legacy format: just an array of swim times
        importedTimes = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.time_entries)) {
        // New format: object with version and time_entries
        importedTimes = parsed.time_entries;
      } else {
        result.errors.push("Invalid data format: expected an array or an object with time_entries");
        return result;
      }

      const existingTimes = this.getAll();
      const existingMap = new Map(existingTimes.map(t => [t.id, t]));

      for (const time of importedTimes) {
        // Validate required fields
        if (!time.athleteName || !time.eventName || !time.date ||
            !time.measuredTime || !time.stroke || !time.distance || !time.poolLength) {
          result.errors.push(`Skipped invalid entry: ${JSON.stringify(time)}`);
          result.skipped++;
          continue;
        }

        // Ensure imported time has last_modified (use date as fallback for legacy data)
        const importedLastModified = time.last_modified || time.date || new Date().toISOString();

        // If ID exists, compare timestamps and keep the newer version
        if (time.id && existingMap.has(time.id)) {
          const existing = existingMap.get(time.id)!;
          const existingLastModified = existing.last_modified || existing.date;

          // Keep the version with the newer last_modified timestamp
          if (new Date(importedLastModified) > new Date(existingLastModified)) {
            // Imported version is newer, update existing
            const updatedTime: SwimTime = {
              ...time,
              id: time.id,
              splits: time.splits || null,
              last_modified: importedLastModified,
            };
            existingMap.set(time.id, updatedTime);
            result.updated++;
          } else {
            // Existing version is newer or same, skip
            result.skipped++;
          }
          continue;
        }

        // New entry (assign new ID if missing)
        const newTime: SwimTime = {
          ...time,
          id: time.id || crypto.randomUUID(),
          splits: time.splits || null,
          last_modified: importedLastModified,
        };

        existingMap.set(newTime.id, newTime);
        result.imported++;
      }

      this.save(Array.from(existingMap.values()));
    } catch (error) {
      result.errors.push(`Failed to parse JSON: ${error}`);
    }

    return result;
  }

  // Clear all data
  clearAll(): void {
    this.save([]);
  }
}

export const swimStorage = new LocalSwimStorage();
