import React from 'react';
import { Lock, Star, Trophy, Award, Crown } from 'lucide-react';

interface LevelCardProps {
  level: number;
  isUnlocked: boolean;
  questionsCount: number;
  completedCount: number;
  accuracy: number;
  onClick: () => void;
  colorClass: string;
}

const levelConfig = [
  { name: 'Level 1', icon: Star, subtitle: 'Beginner' },
  { name: 'Level 2', icon: Award, subtitle: 'Intermediate' },
  { name: 'Level 3', icon: Trophy, subtitle: 'Advanced' },
  { name: 'Final Level', icon: Crown, subtitle: 'Expert' },
];

const LevelCard: React.FC<LevelCardProps> = ({
  level,
  isUnlocked,
  questionsCount,
  completedCount,
  accuracy,
  onClick,
  colorClass
}) => {
  const config = levelConfig[level - 1] || levelConfig[0];
  const Icon = config.icon;
  const progressPercent = questionsCount > 0 ? Math.round((completedCount / questionsCount) * 100) : 0;

  return (
    <button
      onClick={onClick}
      disabled={!isUnlocked}
      className={`group bg-card rounded-2xl shadow-card border border-border p-6 text-center transition-all relative overflow-hidden ${
        isUnlocked 
          ? `hover:border-${colorClass}/50 hover:shadow-lg cursor-pointer` 
          : 'opacity-60 cursor-not-allowed'
      }`}
    >
      {!isUnlocked && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Lock className="w-8 h-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Need 80% in Level {level - 1}</span>
          </div>
        </div>
      )}
      
      <div className={`w-14 h-14 mx-auto rounded-xl bg-${colorClass}/10 flex items-center justify-center mb-4 ${
        isUnlocked ? `group-hover:bg-${colorClass}/20` : ''
      } transition-colors`}>
        <Icon className={`w-7 h-7 text-${colorClass}`} />
      </div>
      
      <h3 className="font-semibold text-foreground">{config.name}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{config.subtitle}</p>
      <p className="text-sm text-muted-foreground mt-2">
        {questionsCount} {questionsCount === 1 ? 'item' : 'items'}
      </p>
      
      {isUnlocked && completedCount > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full bg-${colorClass} transition-all`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount}/{questionsCount} • {accuracy}% accuracy
          </p>
        </div>
      )}
    </button>
  );
};

export default LevelCard;
