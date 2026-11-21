import { Activity, Bike, Dumbbell, Footprints, Mountain, PersonStanding, Volleyball, Waves } from "lucide-react";

const ICONS = { run: Footprints, bike: Bike, hike: Mountain, strength: Dumbbell, swim: Waves, ball: Volleyball, yoga: PersonStanding, other: Activity } as const;

export const ACTIVITY_ICON_LABELS: Record<keyof typeof ICONS, string> = {
  run: "Laufen",
  bike: "Rad",
  hike: "Wandern",
  strength: "Kraft",
  swim: "Schwimmen",
  ball: "Ball",
  yoga: "Yoga",
  other: "Sonstiges",
};

export function ActivityIcon({ icon, className }: { icon: string | null | undefined; className?: string }) {
  const Icon = ICONS[(icon ?? "other") as keyof typeof ICONS] ?? Activity;
  return <Icon className={className} aria-hidden />;
}
