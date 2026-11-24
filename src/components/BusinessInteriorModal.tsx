import { useEffect, useRef, useState } from 'react';
import {
  X,
  Coins,
  ArrowUpCircle,
  Users,
  Megaphone,
  Sparkles,
} from 'lucide-react';
import type { BusinessTypeId, MarketEvent, OwnedBusiness } from '../types/game';
import { getBlueprintById } from '../game/catalog';
import {
  calculateBoostCost,
  calculateBusinessCapacity,
  calculateBusinessHourlyIncome,
  calculateBusinessIncomePerSec,
  calculateStaffHireCost,
  calculateUpgradeCost,
  formatTL,
  hasAvmSynergyForBusiness,
} from '../game/economy';

interface BusinessInteriorModalProps {
  business: OwnedBusiness | null;
  allOwnBusinesses: OwnedBusiness[];
  cash: number;
  activeEvent: MarketEvent | null;
  now: number;
  onCollect: (businessId: string) => void;
  onUpgrade: (businessId: string) => void;
  onHireStaff: (businessId: string) => void;
  onBoost: (businessId: string) => void;
  onClose: () => void;
}

interface StationPoint {
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  w: number;
  h: number;
  kind: string;
}

interface AiCustomer {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  stationIdx: number;
  state: 'entering' | 'using' | 'exiting';
  stayTimer: number;
  color: string;
  speed: number;
}

interface CashFloat {
  x: number;
  y: number;
  label: string;
  life: number;
}

const CUSTOMER_COLORS = ['#F59E0B', '#38BDF8', '#34D399', '#F472B6', '#A78BFA', '#FB7185', '#FBBF24'];

function buildStationsForType(type: BusinessTypeId, level: number): StationPoint[] {
  const count = Math.min(12, 4 + level);
  const stations: StationPoint[] = [];

  if (type === 'kafe') {
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      stations.push({
        x: 0.22 + col * 0.19,
        y: 0.34 + row * 0.22,
        w: 0.085,
        h: 0.085,
        kind: 'cafe-table',
      });
    }
  } else if (type === 'internet_kafe') {
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      stations.push({
        x: 0.2 + col * 0.2,
        y: 0.28 + row * 0.24,
        w: 0.12,
        h: 0.075,
        kind: 'pc-desk',
      });
    }
  } else if (type === 'ps_salonu') {
    for (let i = 0; i < Math.min(9, 3 + level); i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      stations.push({
        x: 0.22 + col * 0.28,
        y: 0.28 + row * 0.24,
        w: 0.17,
        h: 0.11,
        kind: 'ps-booth',
      });
    }
  } else if (type === 'oyun_merkezi') {
    for (let i = 0; i < Math.min(9, 3 + level); i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      stations.push({
        x: 0.22 + col * 0.28,
        y: 0.3 + row * 0.24,
        w: 0.14,
        h: 0.13,
        kind: 'vr-pad',
      });
    }
  } else if (type === 'restoran') {
    for (let i = 0; i < count; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      stations.push({
        x: 0.2 + col * 0.2,
        y: 0.34 + row * 0.21,
        w: 0.1,
        h: 0.085,
        kind: 'dining-table',
      });
    }
  } else if (type === 'supermarket') {
    for (let i = 0; i < Math.min(10, 4 + level); i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      stations.push({
        x: 0.16 + col * 0.17,
        y: 0.32 + row * 0.28,
        w: 0.09,
        h: 0.17,
        kind: 'aisle',
      });
    }
  } else if (type === 'otel') {
    for (let i = 0; i < Math.min(10, 4 + level); i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      stations.push({
        x: 0.16 + col * 0.17,
        y: 0.28 + row * 0.32,
        w: 0.11,
        h: 0.12,
        kind: 'suite',
      });
    }
  } else {
    // avm
    for (let i = 0; i < Math.min(10, 4 + level); i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      stations.push({
        x: 0.15 + col * 0.175,
        y: 0.24 + row * 0.44,
        w: 0.125,
        h: 0.16,
        kind: 'mall-shop',
      });
    }
  }

  return stations;
}

const FLOOR_THEMES: Record<
  BusinessTypeId,
  { floor: string; grid: string; counter: string; label: string; accent: string }
> = {
  kafe: {
    floor: '#2A1F18',
    grid: 'rgba(217,119,6,0.12)',
    counter: '#78350F',
    label: 'ESPRESSO BAR & VİTRİN',
    accent: '#F59E0B',
  },
  internet_kafe: {
    floor: '#0B1325',
    grid: 'rgba(56,189,248,0.12)',
    counter: '#1E293B',
    label: 'KASA & SUNUCU ODASI',
    accent: '#38BDF8',
  },
  ps_salonu: {
    floor: '#121029',
    grid: 'rgba(129,140,248,0.12)',
    counter: '#312E81',
    label: 'KONSOL RESEPSİYON & SNACK BAR',
    accent: '#818CF8',
  },
  oyun_merkezi: {
    floor: '#140E24',
    grid: 'rgba(192,132,252,0.13)',
    counter: '#4C1D95',
    label: 'VR ARENA KONTROL MERKEZİ',
    accent: '#C084FC',
  },
  restoran: {
    floor: '#231615',
    grid: 'rgba(248,113,113,0.1)',
    counter: '#7F1D1D',
    label: 'AÇIK ŞEF MUTFAĞI',
    accent: '#F87171',
  },
  supermarket: {
    floor: '#0F1F1D',
    grid: 'rgba(52,211,153,0.11)',
    counter: '#065F46',
    label: 'HIZLI ÖDEME KASALARI',
    accent: '#34D399',
  },
  otel: {
    floor: '#122126',
    grid: 'rgba(45,212,191,0.11)',
    counter: '#134E4A',
    label: 'MERMER RESEPSİYON & KONSYERJ',
    accent: '#2DD4BF',
  },
  avm: {
    floor: '#1A1812',
    grid: 'rgba(250,204,21,0.11)',
    counter: '#713F12',
    label: 'ATRİYUM MEYDANI & DANIŞMA',
    accent: '#FACC15',
  },
  otopark: {
    floor: '#1E293B',
    grid: 'rgba(148,163,184,0.16)',
    counter: '#334155',
    label: 'OTOMATİK BARİYER & PLAKA TANIMA',
    accent: '#94A3B8',
  },
  katli_otopark: {
    floor: '#0F172A',
    grid: 'rgba(56,189,248,0.14)',
    counter: '#1E293B',
    label: 'VALE KONTROL & EV ŞARJ MERKEZİ',
    accent: '#38BDF8',
  },
  gida_fabrikasi: {
    floor: '#1F1612',
    grid: 'rgba(251,146,60,0.14)',
    counter: '#9A3412',
    label: 'GIDA ÜRETİM BANDI & SOĞUK ZİNCİR',
    accent: '#FB923C',
  },
  elektronik_fabrikasi: {
    floor: '#081826',
    grid: 'rgba(14,165,233,0.16)',
    counter: '#075985',
    label: 'TEMİZ ODA ROBOTİK MONTAJ HATTI',
    accent: '#0EA5E9',
  },
  tekstil_fabrikasi: {
    floor: '#1B1126',
    grid: 'rgba(192,132,252,0.14)',
    counter: '#6B21A8',
    label: 'CNC DOKUMA & İHRACAT BANDI',
    accent: '#C084FC',
  },
};

export function BusinessInteriorModal({
  business,
  allOwnBusinesses,
  cash,
  activeEvent,
  now,
  onCollect,
  onUpgrade,
  onHireStaff,
  onBoost,
  onClose,
}: BusinessInteriorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [liveVisitorCount, setLiveVisitorCount] = useState(0);
  const [servedCount, setServedCount] = useState(0);

  const bizId = business?.id ?? '';
  const bizType = business?.blueprintId ?? 'kafe';
  const bizLevel = business?.level ?? 1;
  const bizStaff = business?.staffCount ?? 0;

  useEffect(() => {
    if (!business) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stations = buildStationsForType(bizType, bizLevel);
    const theme = FLOOR_THEMES[bizType];
    const maxActiveCustomers = Math.min(stations.length + 2, 4 + bizLevel + Math.floor(bizStaff / 2));

    let nextId = 1;
    const customers: AiCustomer[] = [];
    const floats: CashFloat[] = [];
    let spawnCooldown = 0.25;
    let rafId = 0;
    let lastTs = performance.now();
    let localServed = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(200, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const occupiedStations = () =>
      new Set(customers.filter((c) => c.state !== 'exiting').map((c) => c.stationIdx));

    const spawnCustomer = () => {
      const occ = occupiedStations();
      const freeIndices = stations
        .map((_, idx) => idx)
        .filter((idx) => !occ.has(idx));
      if (freeIndices.length === 0) return;

      const stationIdx = freeIndices[Math.floor(Math.random() * freeIndices.length)];
      const st = stations[stationIdx];
      customers.push({
        id: nextId++,
        x: 0.5 + (Math.random() - 0.5) * 0.08,
        y: 0.96,
        targetX: st.x,
        targetY: st.y + st.h * 0.4,
        stationIdx,
        state: 'entering',
        stayTimer: 2.2 + Math.random() * 2.6,
        color: CUSTOMER_COLORS[nextId % CUSTOMER_COLORS.length],
        speed: 0.24 + Math.random() * 0.1,
      });
    };

    // Pre-populate 3 customers so the interior feels immediately alive
    for (let i = 0; i < Math.min(3, stations.length); i++) {
      spawnCustomer();
      if (customers[i]) {
        customers[i].x = customers[i].targetX;
        customers[i].y = customers[i].targetY;
        customers[i].state = 'using';
      }
    }

    const bp = getBlueprintById(bizType);
    const ticketAmount = Math.round(((bp?.baseHourlyIncome ?? 3600) / 14) * (1 + (bizLevel - 1) * 0.35));

    const draw = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;

      // Update simulation
      spawnCooldown -= dt;
      if (spawnCooldown <= 0 && customers.length < maxActiveCustomers) {
        spawnCustomer();
        spawnCooldown = Math.max(0.45, 1.5 - bizLevel * 0.1);
      }

      for (let i = customers.length - 1; i >= 0; i--) {
        const c = customers[i];
        if (c.state === 'entering' || c.state === 'exiting') {
          const dx = c.targetX - c.x;
          const dy = c.targetY - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.015) {
            if (c.state === 'entering') {
              c.state = 'using';
            } else {
              customers.splice(i, 1);
            }
          } else {
            c.x += (dx / dist) * c.speed * dt;
            c.y += (dy / dist) * c.speed * dt;
          }
        } else {
          c.stayTimer -= dt;
          if (c.stayTimer <= 0) {
            c.state = 'exiting';
            c.targetX = 0.5;
            c.targetY = 0.98;
            localServed += 1;
            setServedCount(localServed);
            floats.push({
              x: c.x,
              y: c.y - 0.03,
              label: `+${formatTL(ticketAmount)}`,
              life: 1.0,
            });
          }
        }
      }

      for (let i = floats.length - 1; i >= 0; i--) {
        floats[i].y -= 0.08 * dt;
        floats[i].life -= dt * 0.9;
        if (floats[i].life <= 0) floats.splice(i, 1);
      }

      setLiveVisitorCount(customers.length);

      // Render floorplan
      ctx.fillStyle = theme.floor;
      ctx.fillRect(0, 0, w, h);

      // Architectural tile grid
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      const step = 28;
      for (let gx = 0; gx < w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // Outer room walls
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Top service counter / kitchen / reception (positioned cleanly below HUD strip)
      const counterY = 44;
      const counterH = Math.max(26, h * 0.09);
      ctx.fillStyle = theme.counter;
      ctx.fillRect(w * 0.2, counterY, w * 0.6, counterH);
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.2, counterY, w * 0.6, counterH);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(theme.label, w * 0.5, counterY + counterH * 0.62);

      // Central fountain/atrium feature for AVM
      if (bizType === 'avm') {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,248,0.24)';
        ctx.fill();
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Render staff members behind counter
      const visibleStaff = Math.min(6, Math.max(1, bizStaff));
      for (let s = 0; s < visibleStaff; s++) {
        const sx = w * (0.28 + (s / Math.max(1, visibleStaff - 1 || 1)) * 0.44);
        const sy = counterY + counterH + 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Render sector-specific stations
      const occ = occupiedStations();
      stations.forEach((st, idx) => {
        const px = st.x * w;
        const py = st.y * h;
        const sw = st.w * w;
        const sh = st.h * h;
        const isBusy = occ.has(idx);

        ctx.save();
        ctx.translate(px - sw / 2, py - sh / 2);

        if (st.kind === 'cafe-table' || st.kind === 'dining-table') {
          ctx.beginPath();
          ctx.arc(sw / 2, sh / 2, Math.min(sw, sh) * 0.48, 0, Math.PI * 2);
          ctx.fillStyle = isBusy ? 'rgba(245,158,11,0.34)' : 'rgba(255,255,255,0.12)';
          ctx.fill();
          ctx.strokeStyle = isBusy ? theme.accent : 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (st.kind === 'pc-desk') {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(0, 0, sw, sh);
          ctx.strokeStyle = isBusy ? '#38BDF8' : 'rgba(148,163,184,0.4)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, sw, sh);
          // Monitor screen glow
          ctx.fillStyle = isBusy ? '#38BDF8' : '#475569';
          ctx.fillRect(sw * 0.22, sh * 0.18, sw * 0.56, sh * 0.26);
        } else if (st.kind === 'ps-booth') {
          ctx.fillStyle = '#1E1B4B';
          ctx.fillRect(0, 0, sw, sh);
          ctx.strokeStyle = isBusy ? '#818CF8' : 'rgba(148,163,184,0.35)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, sw, sh);
          // Wide 4K TV + Sofa
          ctx.fillStyle = isBusy ? '#6366F1' : '#334155';
          ctx.fillRect(sw * 0.15, sh * 0.1, sw * 0.7, sh * 0.22);
          ctx.fillStyle = '#4338CA';
          ctx.fillRect(sw * 0.18, sh * 0.62, sw * 0.64, sh * 0.26);
        } else if (st.kind === 'vr-pad') {
          ctx.fillStyle = isBusy ? 'rgba(192,132,252,0.28)' : 'rgba(255,255,255,0.08)';
          ctx.fillRect(0, 0, sw, sh);
          ctx.strokeStyle = isBusy ? '#C084FC' : 'rgba(192,132,252,0.35)';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, sw, sh);
        } else {
          // aisle / suite / mall-shop
          ctx.fillStyle = isBusy ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)';
          ctx.fillRect(0, 0, sw, sh);
          ctx.strokeStyle = isBusy ? theme.accent : 'rgba(255,255,255,0.28)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(0, 0, sw, sh);
        }

        ctx.restore();
      });

      // Entrance door indicator
      ctx.fillStyle = '#10B981';
      ctx.fillRect(w * 0.43, h - 12, w * 0.14, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GİRİŞ', w * 0.5, h - 16);

      // Render autonomous AI customers
      for (const c of customers) {
        const cx = c.x * w;
        const cy = c.y * h;
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Active pulse ring while spending
        if (c.state === 'using') {
          ctx.beginPath();
          ctx.arc(cx, cy, 10, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Render floating +₺ customer payment popups
      for (const f of floats) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, f.life);
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#34D399';
        ctx.textAlign = 'center';
        ctx.fillText(f.label, f.x * w, f.y * h);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [business, bizId, bizType, bizLevel, bizStaff]);

  if (!business) return null;

  const bp = getBlueprintById(business.blueprintId);
  const incomePerSec = calculateBusinessIncomePerSec(
    business,
    activeEvent,
    now,
    allOwnBusinesses
  );
  const hourlyIncome = calculateBusinessHourlyIncome(
    business,
    activeEvent,
    now,
    allOwnBusinesses
  );
  const capacity = calculateBusinessCapacity(business);
  const avmBonus = hasAvmSynergyForBusiness(business, allOwnBusinesses);
  const upgradeCost = calculateUpgradeCost(business);
  const staffCost = calculateStaffHireCost(business);
  const boostCost = calculateBoostCost(business);
  const pendingWhole = Math.floor(business.pendingCash);
  const boostRemainingSec = Math.max(0, Math.ceil((business.boostEndsAt - now) / 1000));
  const isMaxLevel = bp ? business.level >= bp.maxLevel : true;
  const isMaxStaff = bp ? business.staffCount >= bp.maxStaff : true;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${business.customName} İç Mekan Yönetimi`}
      data-testid="business-interior-modal"
      className="fixed inset-0 z-[1260] flex items-center justify-center bg-slate-950/65 p-3 safe-inset"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-2xl lg:max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="compact-short-pad flex shrink-0 items-center justify-between border-b border-slate-200 px-3.5 py-2 dark:border-slate-800 sm:px-4 sm:py-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              <span>{bp?.name}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{bp?.interiorTheme}</span>
              {avmBonus && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    AVM +%25
                  </span>
                </>
              )}
            </div>
            <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white sm:text-base">
              {business.customName} · {business.cityName} ({business.districtName})
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="İç Mekan Görünümünü Kapat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:h-9 sm:w-9"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Landscape 2-column body: Live AI Interior Canvas + Quick Management Controls */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden p-2.5 min-[600px]:grid-cols-[1fr_240px] lg:grid-cols-[1fr_270px] sm:p-3">
          {/* Live Autonomous Customer Floorplan Canvas */}
          <div className="relative flex min-h-[160px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-700">
            <canvas
              ref={canvasRef}
              data-testid="interior-canvas"
              className="h-full w-full block"
            />
            <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-lg bg-slate-950/80 px-2 py-1 text-[10.5px] font-semibold text-white">
              <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
              <span>Müşteri: {liveVisitorCount}</span>
              <span aria-hidden="true">·</span>
              <span>Hizmet: {servedCount}</span>
              <span aria-hidden="true">·</span>
              <span>Kap: {capacity}</span>
            </div>
          </div>

          {/* Right Management Column */}
          <div className="panel-scroll min-h-0 flex flex-col justify-between gap-2 overflow-y-auto overscroll-contain">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Saatlik Gelir</div>
                  <div className="font-mono-num text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                    {formatTL(hourlyIncome)}/sa
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Anlık Akış</div>
                  <div className="font-mono-num text-xs font-extrabold text-amber-700 dark:text-amber-400">
                    +{formatTL(incomePerSec)}/sn
                  </div>
                </div>
              </div>

              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-200">Yükseltme Odağı:</strong>{' '}
                {bp?.upgradeFocus}
              </p>

              <button
                type="button"
                disabled={pendingWhole <= 0}
                onClick={() => onCollect(business.id)}
                className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800"
              >
                <Coins className="h-4 w-4" />
                <span>
                  {pendingWhole > 0 ? `Kasayı Topla (${formatTL(pendingWhole)})` : 'Kasa Birikiyor'}
                </span>
              </button>

              <button
                type="button"
                disabled={isMaxLevel || cash < upgradeCost}
                onClick={() => onUpgrade(business.id)}
                className="flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold hover:bg-amber-50 disabled:opacity-55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5">
                  <ArrowUpCircle className="h-4 w-4 text-amber-600" />
                  {isMaxLevel ? 'Maksimum Seviye' : `Sv.${business.level + 1} Yükselt`}
                </span>
                {!isMaxLevel && (
                  <span className="font-mono-num text-amber-700 dark:text-amber-400">
                    {formatTL(upgradeCost)}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={isMaxStaff || cash < staffCost}
                onClick={() => onHireStaff(business.id)}
                className="flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold hover:bg-sky-50 disabled:opacity-55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-sky-600" />
                  Personel ({business.staffCount}/{bp?.maxStaff})
                </span>
                {!isMaxStaff && (
                  <span className="font-mono-num text-sky-700 dark:text-sky-400">
                    {formatTL(staffCost)}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={boostRemainingSec > 0 || cash < boostCost}
                onClick={() => onBoost(business.id)}
                className="flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold hover:bg-indigo-50 disabled:opacity-55 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <span className="flex items-center gap-1.5">
                  <Megaphone className="h-4 w-4 text-indigo-600" />
                  {boostRemainingSec > 0 ? `2x Aktif (${boostRemainingSec}sn)` : '2x Kampanya'}
                </span>
                {boostRemainingSec === 0 && (
                  <span className="font-mono-num text-indigo-700 dark:text-indigo-400">
                    {formatTL(boostCost)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
