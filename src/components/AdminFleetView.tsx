import React, { useState, useEffect } from 'react';
import {
  Bike,
  Plus,
  Zap,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Power,
  ShieldCheck,
  Star,
  Users,
  Navigation,
  Compass,
  RefreshCw,
  ExternalLink,
  Key,
  Lock,
  Mail,
  Trash2
} from 'lucide-react';
import { DriverRecord, OrderRecord } from '../types';
import { getRegisteredDrivers, registerDriverAccount, deleteDriverAccount } from '../utils/authStore';

interface AdminFleetViewProps {
  orders: OrderRecord[];
  onReassignDriver: (orderId: string, newDriverName: string) => void;
}

export const AdminFleetView: React.FC<AdminFleetViewProps> = ({
  orders,
  onReassignDriver,
}) => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  // Add Driver Modal State with Email and Password
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPassword, setNewDriverPassword] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('+91 ');
  const [newDriverVehicle, setNewDriverVehicle] = useState('AP-39-EQ-');
  const [newDriverType, setNewDriverType] = useState<'electric_scooter' | 'bike' | 'van'>('electric_scooter');
  const [newDriverZone, setNewDriverZone] = useState('KN Road Hub (Tadepalligudem 534102)');
  const [formError, setFormError] = useState<string | null>(null);

  // Reassign Modal
  const [reassignModalOrder, setReassignModalOrder] = useState<OrderRecord | null>(null);
  const [selectedReassignDriver, setSelectedReassignDriver] = useState('');

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      const serverDrivers: DriverRecord[] = res.ok ? (await res.json()).drivers || [] : [];
      const registered = getRegisteredDrivers();

      // Merge backend drivers and registered accounts
      const mergedMap = new Map<string, DriverRecord>();

      serverDrivers.forEach((d) => {
        mergedMap.set(d.id, d);
      });

      registered.forEach((reg) => {
        const existing = mergedMap.get(reg.id);
        if (existing) {
          mergedMap.set(reg.id, {
            ...existing,
            email: reg.email,
            password: reg.password,
            vehicleNumber: reg.vehicleNumber || existing.vehicleNumber,
            zone: reg.zone || existing.zone,
          });
        } else {
          mergedMap.set(reg.id, {
            id: reg.id,
            name: reg.name,
            email: reg.email,
            password: reg.password,
            phone: reg.phone || '+91 99000 00000',
            vehicleNumber: reg.vehicleNumber || 'AP-39-EQ-4421',
            vehicleType: reg.vehicleType || 'electric_scooter',
            zone: reg.zone || 'KN Road Hub, Tadepalligudem',
            isOnline: true,
            status: 'available',
            rating: 5.0,
            deliveriesToday: 0,
            earningsToday: 0,
            batteryLevel: 100,
            currentCoords: { lat: 16.8145, lng: 81.5285, heading: 0, speed: 0 },
          });
        }
      });

      setDrivers(Array.from(mergedMap.values()));
    } catch (e) {
      console.error('Failed to fetch fleet:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newDriverName.trim()) {
      setFormError('Please enter driver name');
      return;
    }
    if (!newDriverEmail.trim() || !newDriverEmail.includes('@')) {
      setFormError('Please enter a valid driver email address (e.g. driver@freshlane.com)');
      return;
    }
    if (!newDriverPassword.trim() || newDriverPassword.trim().length < 4) {
      setFormError('Driver password must be at least 4 characters long');
      return;
    }
    if (!newDriverPhone.trim() || newDriverPhone.trim().length < 8) {
      setFormError('Please enter a valid driver mobile number');
      return;
    }
    if (!newDriverVehicle.trim()) {
      setFormError('Please enter vehicle registration number');
      return;
    }

    try {
      // 1. Register in authStore so driver can immediately log in
      const regRes = registerDriverAccount({
        name: newDriverName.trim(),
        email: newDriverEmail.trim(),
        password: newDriverPassword.trim(),
        phone: newDriverPhone.trim(),
        vehicleNumber: newDriverVehicle.trim(),
        vehicleType: newDriverType,
        zone: newDriverZone,
      });

      if (!regRes.success) {
        setFormError(regRes.error || 'Failed to register driver');
        return;
      }

      // 2. Register on server dispatch engine
      await fetch('/api/admin/driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDriverName.trim(),
          email: newDriverEmail.trim(),
          password: newDriverPassword.trim(),
          phone: newDriverPhone.trim(),
          vehicleNumber: newDriverVehicle.trim(),
          vehicleType: newDriverType,
          zone: newDriverZone,
        }),
      });

      // Clear & close
      setIsAddDriverOpen(false);
      setNewDriverName('');
      setNewDriverEmail('');
      setNewDriverPassword('');
      setNewDriverPhone('+91 ');
      setNewDriverVehicle('AP-39-EQ-');
      setFormError(null);
      fetchDrivers();
    } catch (err) {
      console.error('Failed to add driver:', err);
      setFormError('An error occurred while creating driver account.');
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm(`Are you sure you want to revoke and delete driver (${driverId})?`)) return;

    deleteDriverAccount(driverId);
    try {
      await fetch(`/api/admin/driver/${driverId}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Delete driver error:', e);
    }
    fetchDrivers();
  };

  const handleConfirmReassign = () => {
    if (!reassignModalOrder || !selectedReassignDriver) return;
    onReassignDriver(reassignModalOrder.id, selectedReassignDriver);
    setReassignModalOrder(null);
  };

  const onlineDrivers = drivers.filter((d) => d.isOnline);
  const busyDrivers = drivers.filter((d) => d.status === 'busy');

  // City Zones definition for map
  const zoneCoordinates: Record<string, { x: number; y: number }> = {
    Indiranagar: { x: 35, y: 35 },
    Koramangala: { x: 45, y: 65 },
    'HSR Layout': { x: 60, y: 75 },
    Whitefield: { x: 80, y: 25 },
  };

  return (
    <div className="space-y-6">
      {/* Fleet KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{drivers.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Registered Fleet</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{onlineDrivers.length}</div>
            <div className="text-xs font-medium text-slate-500">Active Online Riders</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Navigation className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">{busyDrivers.length}</div>
            <div className="text-xs font-medium text-slate-500">In-Transit Deliveries</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">88%</div>
            <div className="text-xs font-medium text-slate-500">Avg Fleet Battery</div>
          </div>
        </div>
      </div>

      {/* Live Fleet Map Section */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Live Tadepalligudem (534102) Fleet Command Map
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time GPS telematics showing active 15km express delivery zones and driver clusters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Delivery Partner</span>
            </button>
          </div>
        </div>

        {/* Vector Fleet Visualizer */}
        <div className="relative h-72 sm:h-80 w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden select-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Grid overlay */}
            <path
              d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"
              stroke="#1E293B"
              strokeWidth="0.5"
            />
            {/* Highway representation (AH45 / NH16 Bypass) */}
            <path
              d="M 10 20 Q 50 10 90 30 T 70 85 T 25 75 Z"
              fill="none"
              stroke="#334155"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />

            {/* Zone Markers (Tadepalligudem 15km delivery zone) */}
            <g transform="translate(35, 35)">
              <circle r="12" fill="#10B981" fillOpacity="0.08" stroke="#10B981" strokeWidth="0.3" strokeDasharray="1 1" />
              <text x="0" y="-8" fill="#34D399" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                KN Road Hub
              </text>
            </g>

            <g transform="translate(45, 65)">
              <circle r="10" fill="#3B82F6" fillOpacity="0.08" stroke="#3B82F6" strokeWidth="0.3" strokeDasharray="1 1" />
              <text x="0" y="-6" fill="#60A5FA" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                Subba Rao Peta
              </text>
            </g>

            <g transform="translate(65, 75)">
              <circle r="9" fill="#8B5CF6" fillOpacity="0.08" stroke="#8B5CF6" strokeWidth="0.3" strokeDasharray="1 1" />
              <text x="0" y="-6" fill="#A78BFA" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                Pentapadu Zone
              </text>
            </g>

            <g transform="translate(80, 25)">
              <circle r="9" fill="#F59E0B" fillOpacity="0.08" stroke="#F59E0B" strokeWidth="0.3" strokeDasharray="1 1" />
              <text x="0" y="-6" fill="#FBBF24" fontSize="2.5" fontWeight="bold" textAnchor="middle">
                Housing Board Zone
              </text>
            </g>

            {/* Render Driver Pins */}
            {drivers.map((drv, idx) => {
              // Calculate relative projection
              let x = 35 + (idx % 3) * 15 - 5;
              let y = 35 + (idx % 2) * 20;
              if (drv.zone.includes('Subba Rao') || drv.zone.includes('Koramangala')) {
                x = 45;
                y = 65;
              } else if (drv.zone.includes('Pentapadu') || drv.zone.includes('HSR')) {
                x = 65;
                y = 75;
              } else if (drv.zone.includes('Housing') || drv.zone.includes('Whitefield')) {
                x = 80;
                y = 25;
              }

              return (
                <g
                  key={drv.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedDriver(drv)}
                >
                  <circle
                    r="3.5"
                    fill={drv.status === 'busy' ? '#3B82F6' : drv.isOnline ? '#10B981' : '#64748B'}
                    opacity="0.3"
                    className={drv.isOnline ? 'animate-ping' : ''}
                  />
                  <circle
                    r="2.2"
                    fill={drv.status === 'busy' ? '#2563EB' : drv.isOnline ? '#059669' : '#475569'}
                    stroke="#ffffff"
                    strokeWidth="0.5"
                  />
                </g>
              );
            })}
          </svg>

          {/* Map Overlay Badges */}
          <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-slate-900/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700/70 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Busy (In-Transit)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Roster Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              Fleet Partners &amp; Assignment
            </h3>
            <p className="text-xs text-slate-500">
              Manage driver status, EV battery state, and active orders.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Driver</th>
                <th className="pb-3">Vehicle &amp; Zone</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Battery</th>
                <th className="pb-3">Trips Today</th>
                <th className="pb-3">Rating</th>
                <th className="pb-3 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((drv) => {
                return (
                  <tr key={drv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="font-bold text-slate-900">{drv.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{drv.id} · {drv.phone}</div>
                    </td>

                    <td className="py-3">
                      <div className="font-semibold text-slate-800">{drv.vehicleNumber}</div>
                      <div className="text-[11px] text-slate-500">{drv.zone}</div>
                    </td>

                    <td className="py-3">
                      {drv.status === 'busy' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <span>En Route (#{drv.activeOrderId || 'FL-91428'})</span>
                        </span>
                      ) : drv.isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Ready &amp; Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span>Offline</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3">
                      <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>{drv.batteryLevel}%</span>
                      </div>
                    </td>

                    <td className="py-3 font-semibold text-slate-700">
                      {drv.deliveriesToday} drops (₹{drv.earningsToday})
                    </td>

                    <td className="py-3">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        <span>{drv.rating.toFixed(2)}</span>
                      </div>
                    </td>

                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => alert(`Direct dispatch call initiated to ${drv.name} (${drv.phone})`)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Call
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(drv.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                          title="Revoke & Delete Driver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Partner Modal */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Register New Delivery Partner
                </h3>
                <p className="text-[11px] text-slate-500">
                  Create driver login credentials for the Driver &amp; Staff portal.
                </p>
              </div>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-red-700 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddDriver} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Rider Full Name</label>
                <input
                  type="text"
                  required
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Varma"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>Driver Mail ID</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newDriverEmail}
                    onChange={(e) => setNewDriverEmail(e.target.value)}
                    placeholder="ramesh@freshlane.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3 text-slate-500" />
                    <span>Driver Password</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newDriverPassword}
                    onChange={(e) => setNewDriverPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Vehicle Plate No</label>
                  <input
                    type="text"
                    required
                    value={newDriverVehicle}
                    onChange={(e) => setNewDriverVehicle(e.target.value)}
                    placeholder="AP-39-EQ-4421"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Vehicle Type</label>
                  <select
                    value={newDriverType}
                    onChange={(e) => setNewDriverType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 cursor-pointer"
                  >
                    <option value="electric_scooter">Electric Scooter (EV)</option>
                    <option value="bike">Standard Bike</option>
                    <option value="van">Cargo Van</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Assigned Operational Zone</label>
                <select
                  value={newDriverZone}
                  onChange={(e) => setNewDriverZone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-slate-900 cursor-pointer"
                >
                  <option value="KN Road Hub (Tadepalligudem 534102)">KN Road Hub (Tadepalligudem 534102)</option>
                  <option value="Subba Rao Peta Hub (Tadepalligudem 534102)">Subba Rao Peta Hub (Tadepalligudem 534102)</option>
                  <option value="Pentapadu Hub (West Godavari 534166)">Pentapadu Hub (West Godavari 534166)</option>
                  <option value="Housing Board Colony Hub (Tadepalligudem 534101)">Housing Board Colony Hub (Tadepalligudem 534101)</option>
                  <option value="Railway Station & Main Bazaar (534102)">Railway Station &amp; Main Bazaar (534102)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Create Driver Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
