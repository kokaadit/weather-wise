import { Lightbulb, DollarSign, Droplets, Zap, Wind, Thermometer } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface TipChipProps {
  tip: string;
  index: number;
}

export const TipChip = ({ tip, index }: TipChipProps) => {
  const getIcon = (tip: string, index: number) => {
    const tipLower = tip.toLowerCase();
    
    if (tipLower.includes('sprinkler') || tipLower.includes('water') || tipLower.includes('irrigation')) {
      return <Droplets className="w-4 h-4" />;
    }
    if (tipLower.includes('thermostat') || tipLower.includes('temperature') || tipLower.includes('heat') || tipLower.includes('cool')) {
      return <Thermometer className="w-4 h-4" />;
    }
    if (tipLower.includes('wind') || tipLower.includes('fan') || tipLower.includes('turbine')) {
      return <Wind className="w-4 h-4" />;
    }
    if (tipLower.includes('energy') || tipLower.includes('electric') || tipLower.includes('power')) {
      return <Zap className="w-4 h-4" />;
    }
    if (tipLower.includes('money') || tipLower.includes('cost') || tipLower.includes('save') || tipLower.includes('dollar')) {
      return <DollarSign className="w-4 h-4" />;
    }
    
    return <Lightbulb className="w-4 h-4" />;
  };

  const handleCopyTip = () => {
    navigator.clipboard.writeText(tip);
    toast({ title: 'Copied', description: 'Successfully copied to clipboard!' });
  };

  const handleCopyExplicit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(tip);
    toast({ title: 'Copied', description: 'Successfully copied to clipboard!' });
  };

  return (
    <div 
      className="tip-chip cursor-pointer group animate-bounce-in"
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={handleCopyTip}
      title="Click to copy tip"
    >
      {getIcon(tip, index)}
      <span className="flex-1 text-sm">{tip}</span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopyExplicit}
          className="text-xs text-primary hover:text-primary-dark transition-colors"
          title="Copy this tip"
        >
          📋
        </button>
      </div>
    </div>
  );
};