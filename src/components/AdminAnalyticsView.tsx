import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Bike,
  Star,
  Zap,
  BarChart3,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';

export const AdminAnalyticsView: React.FC = () => {
  const [metrics, setMetrics] = useState({
    ordersToday: 48,
    deliveredToday: 42,
    inProgress: 6,
    avgDeliveryMinutes: 23.4,
    onTimeRatePercent: 98.2,
    onlineDrivers: 3,
    totalFleetSize: 4,
    customerSatisfactionAvg: 4.92,
    greenKilometersEV: 148.5,
    co2SavedKg: 18.2,
  });

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.ordersToday) {
          setMetrics(data);
        }
      })
      .catch(console.error);
  }, []);

  const hourlyOrderTraffic = [
    { hour: '7 AM', count: 4, label: 'Breakfast' },
    { hour: '9 AM', count: 12, label: 'Morning Peak' },
    { hour: '11 AM', count: 9, label: 'Lunch Prep' },
    { hour: '1 PM', count: 6, label: 'Afternoon' },
    { hour: '3 PM', count: 5, label: 'Tea Time' },
    { hour: '5 PM', count: 14, label: 'Evening Peak' },
    { hour: '7 PM', count: 18, label: 'Dinner Rush' },
    { hour: '9 PM', count: 7, label: 'Late Night' },
  ];

  const maxTraffic = Math.max(...hourlyOrderTraffic.map((t) => t.count));

  const driverLeaderboard = [
    {
      name: 'Arjun Sharma',
      vehicle: 'Ather 450X',
      trips: 12,
      onTimePct: 99.1,
      rating: 4.95,
      avgSpeedMin: 21.2,
      earnings: 1020,
    },
    {
      name: 'Farah Khan',
      vehicle: 'Ola S1 Pro',
      trips: 10,
      onTimePct: 98.4,
      rating: 4.91,
      avgSpeedMin: 22.8,
      earnings: 850,
    },
    {
      name: 'Vishal Patel',
      vehicle: 'Honda Activa',
      trips: 8,
      onTimePct: 96.8,
      rating: 4.88,
      avgSpeedMin: 24.5,
      earnings: 680,
    },
    {
      name: 'Sunil Reddy',
      vehicle: 'TVS iQube',
      trips: 6,
      onTimePct: 97.2,
      rating: 4.85,
      avgSpeedMin: 23.9,
      earnings: 510,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Orders Today */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Orders Dispatched Today</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
              +18% vs yest.
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {metrics.ordersToday}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{metrics.deliveredToday} completed · {metrics.inProgress} active</span>
          </div>
        </div>

        {/* Avg Delivery Time */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Average Delivery Speed</span>
            <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
              Goal: &lt; 30m
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {metrics.avgDeliveryMinutes} <span className="text-base text-slate-500 font-bold">min</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{metrics.onTimeRatePercent}% on-time SLA adherence</span>
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Customer Rating Avg</span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
              5-Star Target
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2 flex items-center gap-1">
            <span>{metrics.customerSatisfactionAvg}</span>
            <Star className="w-6 h-6 fill-amber-400 text-amber-500 inline" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Based on produce firmness &amp; speed feedback
          </div>
        </div>

        {/* Green Fleet Abatement */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>EV Zero-Emission Fleet</span>
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
              100% EV
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {metrics.greenKilometersEV} <span className="text-base text-slate-500 font-bold">km</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            <span>{metrics.co2SavedKg} kg CO2 emissions prevented</span>
          </div>
        </div>
      </div>

      {/* Hourly Demand Volume Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Hourly Order Volume &amp; Fulfillment Cadence</span>
            </h3>
            <p className="text-xs text-slate-500">
              Peak traffic concentrated during morning smoothie/breakfast and evening dinner prep.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">Today's Timeline</span>
        </div>

        {/* Bar Visualizer */}
        <div className="grid grid-cols-8 gap-2 items-end h-44 pt-6 px-2">
          {hourlyOrderTraffic.map((item, idx) => {
            const heightPercent = Math.round((item.count / maxTraffic) * 100);
            const isPeak = item.count >= 14;

            return (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.count} orders
                </span>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[42px] rounded-xl transition-all duration-500 group-hover:opacity-90 ${
                    isPeak
                      ? 'bg-emerald-600 shadow-sm'
                      : 'bg-slate-200 group-hover:bg-emerald-400'
                  }`}
                />
                <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                  {item.hour}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Driver Performance & Leaderboard */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Bike className="w-4 h-4 text-emerald-600" />
              <span>Delivery Partner Performance Index</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evaluated on 30-minute SLA punctuality, customer satisfaction, and safe handling.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Rank &amp; Rider</th>
                <th className="pb-3">Vehicle</th>
                <th className="pb-3">Completed Trips</th>
                <th className="pb-3">Avg Delivery Speed</th>
                <th className="pb-3">On-Time SLA</th>
                <th className="pb-3">Rating</th>
                <th className="pb-3 text-right pr-2">Today's Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {driverLeaderboard.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[11px] font-black">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{d.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-600">{d.vehicle}</td>
                  <td className="py-3.5 font-semibold text-slate-800">{d.trips} orders</td>
                  <td className="py-3.5 font-mono font-bold text-emerald-600">{d.avgSpeedMin} min</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700">
                      {d.onTimePct}%
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="inline-flex items-center gap-1 font-bold text-slate-800">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      <span>{d.rating}</span>
                    </div>
                  </td>
                  <td className="py-3.5 text-right pr-2 font-mono font-bold text-slate-900">
                    ₹{d.earnings}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
