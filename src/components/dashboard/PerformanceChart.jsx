import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card/90 backdrop-blur-sm border border-subtle p-4 rounded-lg shadow-glow">
        <p className="text-text-primary font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary">{entry.name}:</span>
            <span className="text-text-primary font-mono">{entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PerformanceChart({ data: rawData }) {
  const chartData = rawData && rawData.length > 0 ? rawData.map(d => {
    const dObj = new Date(d.createdAt || Date.now());
    return {
      date: `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}`,
      Overall: d.score || 0,
      Technical: d.technicalScore || d.score || 0, // Fallbacks if specific round metrics are missing
      HR: d.hrScore || d.score || 0,
    };
  }).reverse() : []; // reverse chronological to chronological

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="Technical" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTech)" />
        <Area type="monotone" dataKey="Overall" stroke="var(--accent-green)" strokeWidth={2} fillOpacity={1} fill="url(#colorOverall)" />
        <Line type="monotone" dataKey="HR" stroke="var(--accent-secondary)" strokeWidth={2} dot={{ r: 4, fill: 'var(--bg-card)' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
