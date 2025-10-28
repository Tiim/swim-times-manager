import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { swimStorage } from "@/lib/storage";
import type { SwimTime as SwimTimeType } from "@/lib/storage";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ChartDataPoint {
  date: number;
  dateFormatted: string;
  eventName: string;
  SCM?: number;
  SCY?: number;
  LCM?: number;
  LCY?: number;
  [key: string]: number | string | undefined;
}

export default function TimeProgression() {
  const [match, params] = useRoute("/athlete/:name/progression/:stroke/:distance");
  const [, setLocation] = useLocation();
  const athleteName = params?.name ? decodeURIComponent(params.name) : "";
  const stroke = params?.stroke ? decodeURIComponent(params.stroke) : "";
  const distance = params?.distance ? parseInt(params.distance) : 0;

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [availablePoolLengths, setAvailablePoolLengths] = useState<string[]>([]);

  useEffect(() => {
    if (athleteName && stroke && distance) {
      loadProgressionData();
    }
  }, [athleteName, stroke, distance]);

  const loadProgressionData = () => {
    const resolvedName = swimStorage.resolveAthleteName(athleteName);
    const allTimes = swimStorage.getSwimTimesByAthlete(resolvedName);

    // Filter times for this specific stroke and distance
    const filteredTimes = allTimes.filter(
      (time) =>
        time.stroke === stroke &&
        time.distance === distance
    );

    // Get unique pool lengths
    const poolLengths = Array.from(new Set(filteredTimes.map(t => t.poolLength)));
    setAvailablePoolLengths(poolLengths);

    // Group times by date and pool length
    const timesByDate = new Map<string, Map<string, SwimTimeType>>();

    filteredTimes.forEach((time) => {
      const dateKey = time.date;
      if (!timesByDate.has(dateKey)) {
        timesByDate.set(dateKey, new Map());
      }
      const dateMap = timesByDate.get(dateKey)!;

      // Keep the best time for each pool length on the same date
      const existing = dateMap.get(time.poolLength);
      if (!existing || timeToSeconds(time.measuredTime) < timeToSeconds(existing.measuredTime)) {
        dateMap.set(time.poolLength, time);
      }
    });

    // Convert to chart data format
    const dataPoints: ChartDataPoint[] = [];
    timesByDate.forEach((poolMap, dateKey) => {
      const dataPoint: ChartDataPoint = {
        date: new Date(dateKey).getTime(),
        dateFormatted: new Date(dateKey).toLocaleDateString(),
        eventName: Array.from(poolMap.values())[0].eventName, // Use first event name for the date
      };

      poolMap.forEach((time, poolLength) => {
        dataPoint[poolLength] = timeToSeconds(time.measuredTime);
        dataPoint[`${poolLength}_formatted`] = time.measuredTime;
        dataPoint[`${poolLength}_event`] = time.eventName;
      });

      dataPoints.push(dataPoint);
    });

    // Sort by date
    dataPoints.sort((a, b) => a.date - b.date);

    setChartData(dataPoints);
  };

  const timeToSeconds = (timeString: string): number => {
    const parts = timeString.split(":");
    if (parts.length === 2) {
      // MM:SS.ss format
      const minutes = parseInt(parts[0]);
      const seconds = parseFloat(parts[1]);
      return minutes * 60 + seconds;
    } else {
      // SS.ss format
      return parseFloat(timeString);
    }
  };

  const secondsToTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(2);
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.padStart(5, "0")}`;
    }
    return remainingSeconds;
  };

  if (!match) {
    return <div>Page not found</div>;
  }

  const poolLengthColors: { [key: string]: string } = {
    'SCM': 'hsl(210, 100%, 50%)',
    'SCY': 'hsl(150, 70%, 45%)',
    'LCM': 'hsl(30, 95%, 55%)',
    'LCY': 'hsl(280, 70%, 55%)',
  };

  const personalBests = availablePoolLengths.map(pool => {
    const times = chartData
      .map(d => d[pool] as number | undefined)
      .filter((t): t is number => t !== undefined);
    return times.length > 0 ? Math.min(...times) : null;
  }).filter((t): t is number => t !== null);

  const overallBest = personalBests.length > 0 ? Math.min(...personalBests) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation(`/athlete/${encodeURIComponent(athleteName)}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {athleteName} - {stroke} {distance}m
          </h1>
          <p className="text-muted-foreground">Time Progression</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No times recorded for this event yet.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tabular-nums">
                  {chartData.length}
                </div>
                <p className="text-xs text-muted-foreground">Recorded performances</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Best Overall</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tabular-nums">
                  {overallBest ? secondsToTime(overallBest) : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">Fastest time (any pool)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pool Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tabular-nums">
                  {availablePoolLengths.length}
                </div>
                <p className="text-xs text-muted-foreground">{availablePoolLengths.join(', ')}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time Progression Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tickFormatter={secondsToTime}
                    reversed
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '0.5rem',
                              padding: '8px 12px',
                            }}
                          >
                            <p style={{ color: 'hsl(var(--foreground))', marginBottom: '8px', fontWeight: 500 }}>
                              {new Date(data.date).toLocaleDateString()}
                            </p>
                            {availablePoolLengths.map((pool) => {
                              const timeValue = data[pool];
                              if (timeValue !== undefined) {
                                return (
                                  <div key={pool} style={{ marginBottom: '6px' }}>
                                    <p style={{ color: poolLengthColors[pool], fontWeight: 600, fontSize: '1.1em', fontFamily: 'monospace' }}>
                                      {pool}: {data[`${pool}_formatted`]}
                                    </p>
                                    <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85em' }}>
                                      {data[`${pool}_event`]}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  {availablePoolLengths.map((pool) => (
                    <Line
                      key={pool}
                      type="linear"
                      dataKey={pool}
                      name={pool}
                      stroke={poolLengthColors[pool]}
                      strokeWidth={2}
                      dot={{ fill: poolLengthColors[pool], r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={true}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
