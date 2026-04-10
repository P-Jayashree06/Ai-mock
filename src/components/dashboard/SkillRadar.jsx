import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function SkillRadar({ data: rawData }) {
  const latest = rawData && rawData.length > 0 ? rawData[0] : null;

  // Extract skills from latest interview or use defaults
  const radarData = latest?.resumeData?.skills?.slice(0, 6).map(skill => ({
    subject: skill.length > 15 ? skill.substring(0, 15) + '..' : skill,
    A: latest.score || 80,
    fullMark: 100
  })) || [
    { subject: 'Algorithms', A: 85, fullMark: 100 },
    { subject: 'React', A: 90, fullMark: 100 },
    { subject: 'System Design', A: 70, fullMark: 100 },
    { subject: 'Backend Server', A: 65, fullMark: 100 },
    { subject: 'Communication', A: 88, fullMark: 100 },
    { subject: 'Problem Solving', A: 82, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
        <PolarGrid stroke="var(--border-subtle)" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
        />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}
          itemStyle={{ color: 'var(--text-primary)' }}
        />
        <Radar 
          name="Proficiency" 
          dataKey="A" 
          stroke="var(--accent-primary)" 
          strokeWidth={2}
          fill="var(--accent-primary)" 
          fillOpacity={0.4} 
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
