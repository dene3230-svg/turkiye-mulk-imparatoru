import { useMemo, useState } from 'react';
import {
  Crown,
  Store,
  Award,
  CheckCircle2,
  Factory,
  Car,
  Users,
  Sparkles,
  Building2,
  Swords,
  Link2,
  UserCheck,
  Radar,
  MapPin,
} from 'lucide-react';
import type { BusinessTypeId, EmpireState, FranchiseBrand } from '../types/game';
import {
  FACTORY_TYPES,
  PARKING_TYPES,
  SUPERMARKET_CHAIN_MIN_COUNT,
  getBlueprintById,
} from '../game/catalog';
import {
  checkFranchiseCreationEligibility,
  countSupermarkets,
} from '../game/holdingEngine';
import { getChainBranchGroups } from '../game/strategyEngine';
import { formatTL } from '../game/economy';
import { MobileGameModal, type MobileModalTab } from './MobileGameModal';
import { BrandLogo } from './BrandLogo';
import type { ManagementTabId } from './RivalsStrategyModal';

interface HoldingFranchiseModalProps {
  open: boolean;
  state: EmpireState;
  allFranchises: FranchiseBrand[];
  onSelectManagementTab?: (tab: ManagementTabId) => void;
  onFormSupermarketChain: (chainName: string) => void;
  onCreateFranchise: (params: {
    brandName: string;
    businessType: BusinessTypeId;
    licenseFee: number;
    royaltyRate: number;
  }) => void;
  onApproveFranchiseApp?: (appId: string) => void;
  onToggleAutoApproveApps?: (enabled: boolean) => void;
  onScanAiApplicant?: (franchiseId: string) => void;
  onOpenFranchiseOnMap?: (brand: FranchiseBrand) => void;
  onClose: () => void;
}

export function HoldingFranchiseModal({
  open,
  state,
  allFranchises,
  onSelectManagementTab,
  onFormSupermarketChain,
  onCreateFranchise,
  onApproveFranchiseApp,
  onToggleAutoApproveApps,
  onScanAiApplicant,
  onOpenFranchiseOnMap,
  onClose,
}: HoldingFranchiseModalProps) {
  const [subTab, setSubTab] = useState<'publish' | 'market' | 'chain'>('publish');
  const [selectedSourceKey, setSelectedSourceKey] = useState<string>('');
  const [brandName, setBrandName] = useState('');
  const [licenseFee, setLicenseFee] = useState(75_000);
  const [royaltyPct, setRoyaltyPct] = useState(15);
  const [chainName, setChainName] = useState('');

  const brandGroups = useMemo(() => getChainBranchGroups(state.businesses), [state.businesses]);

  if (!open) return null;

  const smCount = countSupermarkets(state.businesses);
  const factoryCount = state.businesses.filter((b) => FACTORY_TYPES.includes(b.blueprintId)).length;
  const parkingCount = state.businesses.filter((b) => PARKING_TYPES.includes(b.blueprintId)).length;
  const elig = checkFranchiseCreationEligibility(state);
  const applications = state.franchiseApplications ?? [];
  const pendingApps = applications.filter((a) => a.status === 'pending');

  const activeSourceGroup =
    brandGroups.find((g) => g.key === selectedSourceKey) ?? brandGroups[0] ?? null;
  const effectiveBrandName = (brandName || activeSourceGroup?.brandName || '').trim();
  const effectiveSector: BusinessTypeId =
    activeSourceGroup?.businessType ?? elig.eligibleSectors[0] ?? 'kafe';

  const handlePublishFranchise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!elig.eligible || effectiveBrandName.length < 3) return;
    onCreateFranchise({
      brandName: effectiveBrandName,
      businessType: effectiveSector,
      licenseFee,
      royaltyRate: royaltyPct / 100,
    });
    setBrandName('');
  };

  const managementTabs: MobileModalTab[] | undefined = onSelectManagementTab
    ? [
        {
          id: 'portfolio',
          label: 'İşletmelerim',
          badge: state.businesses.length,
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          id: 'hr',
          label: 'İK & Çalışanlar',
          icon: <Users className="h-4 w-4" />,
        },
        {
          id: 'franchise',
          label: 'Franchise & Bayilik',
          badge: (state.ownFranchises?.length ?? 0) + pendingApps.length || undefined,
          icon: <Crown className="h-4 w-4" />,
        },
        {
          id: 'rivals',
          label: 'Rakip İşletmeler',
          icon: <Swords className="h-4 w-4" />,
        },
      ]
    : undefined;

  return (
    <div data-testid="holding-franchise-modal">
      <MobileGameModal
        title="Yönetim Merkezi"
        subtitle="Franchise & Bayilik Pazaryeri · Çift Yönlü Marka Ağı"
        icon={<Crown className="h-4 w-4" />}
        headerRight={
          <span className="rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 px-2.5 py-1.5 font-mono-num text-xs font-bold text-[#7A9E7E] whitespace-nowrap">
            Telif: {formatTL(state.franchiseRoyaltiesEarned ?? 0, true)}
          </span>
        }
        tabs={managementTabs}
        activeTabId="franchise"
        onSelectTab={(id) => onSelectManagementTab?.(id as ManagementTabId)}
        subHeader={
          <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar">
            <button
              type="button"
              data-testid="franchise-subtab-publish"
              onClick={() => setSubTab('publish')}
              className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                subTab === 'publish'
                  ? 'bg-[#7A9E7E] text-[#181F29]'
                  : 'border border-[#334155] bg-[#1D2532] text-slate-200 hover:bg-[#2A3444]'
              }`}
            >
              Franchise Ver & Başvurular ({applications.length})
            </button>
            <button
              type="button"
              data-testid="franchise-subtab-market"
              onClick={() => setSubTab('market')}
              className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                subTab === 'market'
                  ? 'bg-[#7A9E7E] text-[#181F29]'
                  : 'border border-[#334155] bg-[#1D2532] text-slate-200 hover:bg-[#2A3444]'
              }`}
            >
              Pazardan Bayilik Al ({allFranchises.length})
            </button>
            <button
              type="button"
              data-testid="franchise-subtab-chain"
              onClick={() => setSubTab('chain')}
              className={`min-h-[36px] shrink-0 rounded-xl px-3 text-xs font-bold transition ${
                subTab === 'chain'
                  ? 'bg-[#7A9E7E] text-[#181F29]'
                  : 'border border-[#334155] bg-[#1D2532] text-slate-200 hover:bg-[#2A3444]'
              }`}
            >
              Zincir Markalar & Sanayi ({brandGroups.filter((g) => g.isChain).length})
            </button>
          </div>
        }
        onClose={onClose}
        zIndexClass="z-[1260]"
      >
        {subTab === 'publish' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
              {/* Publish Franchise Form */}
              <form
                onSubmit={handlePublishFranchise}
                data-testid="publish-franchise-form"
                className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">İşletmeni Franchise İlanına Çıkar</h3>
                  <span className="rounded-md bg-[#C8AE7D]/15 px-2 py-0.5 text-[10px] font-bold text-[#C8AE7D]">
                    AI + Çok Oyunculu
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Sahip olduğunuz veya zincirleştirdiğiniz işletmenizi Supabase üzerinden bayiliğe
                  açın. Gerçek oyuncular ve AI girişimciler başvurup şube açtığında isim hakkı
                  anında kasaya geçer ve sürekli ciro payı akar.
                </p>

                {!elig.eligible ? (
                  <div className="rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 p-3 text-xs font-semibold text-[#C8AE7D]">
                    {elig.reason}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300">
                        Kaynak İşletme / Zincir Marka
                      </label>
                      <select
                        data-testid="franchise-source-select"
                        value={activeSourceGroup?.key ?? ''}
                        onChange={(e) => {
                          setSelectedSourceKey(e.target.value);
                          const grp = brandGroups.find((g) => g.key === e.target.value);
                          if (grp) setBrandName(grp.brandName);
                        }}
                        className="mt-1 min-h-[42px] w-full rounded-xl border border-[#334155] bg-[#181F29] px-3 text-xs font-semibold text-white"
                      >
                        {brandGroups.map((grp) => (
                          <option key={grp.key} value={grp.key}>
                            {grp.brandName} · {getBlueprintById(grp.businessType)?.shortName} (
                            {grp.isChain ? `Zincir · ${grp.branchCount} Şube` : '1 Şube'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300">
                        Franchise Marka Adı
                      </label>
                      <input
                        type="text"
                        data-testid="franchise-brand-input"
                        maxLength={38}
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder={activeSourceGroup?.brandName || 'Örn: İmparator Kahve Evi'}
                        className="mt-1 min-h-[42px] w-full rounded-xl border border-[#334155] bg-[#181F29] px-3 text-sm text-white"
                      />
                    </div>

                    <div className="space-y-2 rounded-xl border border-[#334155] bg-black/70 p-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">İsim Hakkı Bedeli</span>
                        <span className="font-mono-num text-sm font-black text-[#C8AE7D]">
                          {formatTL(licenseFee)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={25_000}
                        max={1_000_000}
                        step={5_000}
                        value={licenseFee}
                        onChange={(e) => setLicenseFee(Number(e.target.value))}
                        className="w-full accent-amber-400"
                      />
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-semibold text-slate-300">Saatlik Ciro Payı</span>
                        <span className="font-mono-num text-sm font-black text-[#7A9E7E]">
                          %{royaltyPct}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={25}
                        step={1}
                        value={royaltyPct}
                        onChange={(e) => setRoyaltyPct(Number(e.target.value))}
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    <button
                      type="submit"
                      data-testid="publish-franchise-btn"
                      disabled={effectiveBrandName.length < 3}
                      className="min-h-[44px] w-full rounded-xl bg-[#C8AE7D] px-4 text-sm font-bold text-[#181F29] hover:bg-[#D2BB8E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500"
                    >
                      Franchise İlanını Yayınla ({effectiveBrandName || 'Marka'})
                    </button>
                  </div>
                )}
              </form>

              {/* Player's Published Franchise Brands */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Yayındaki Franchise Markalarınız ({(state.ownFranchises ?? []).length})
                  </h3>
                  {onToggleAutoApproveApps && (
                    <button
                      type="button"
                      data-testid="toggle-auto-approve-apps"
                      onClick={() =>
                        onToggleAutoApproveApps(state.autoApproveFranchiseApps === false)
                      }
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
                        state.autoApproveFranchiseApps !== false
                          ? 'bg-[#7A9E7E]/15 text-[#7A9E7E] border border-[#7A9E7E]/45'
                          : 'bg-[#1D2532] text-slate-300 border border-[#334155]'
                      }`}
                    >
                      Oto AI Onay: {state.autoApproveFranchiseApps !== false ? 'Açık' : 'Kapalı'}
                    </button>
                  )}
                </div>

                {(state.ownFranchises ?? []).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#334155] p-6 text-center text-xs text-slate-400">
                    Henüz yayınladığınız bir franchise markası yok. Soldaki formdan ilk ilanınızı
                    yayınlayıp AI ve oyuncu girişimcilerden gelir elde edin.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(state.ownFranchises ?? []).map((f) => (
                      <div
                        key={f.id}
                        data-testid={`own-franchise-card-${f.id}`}
                        className="rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <BrandLogo brandKey={f.brandName} size={38} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-white">
                                {f.brandName}
                              </div>
                              <div className="text-xs text-slate-300">
                                {getBlueprintById(f.businessType)?.name} · Lisans:{' '}
                                {formatTL(f.licenseFee, true)}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right font-mono-num">
                            <div className="text-xs font-bold text-[#7A9E7E]">
                              {f.branchCount} Bayi
                            </div>
                            <div className="text-xs font-bold text-[#C8AE7D]">
                              %{Math.round(f.royaltyRate * 100)} Pay
                            </div>
                          </div>
                        </div>

                        {onScanAiApplicant && (
                          <button
                            type="button"
                            data-testid={`scan-ai-applicant-${f.id}`}
                            onClick={() => onScanAiApplicant(f.id)}
                            className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#C8AE7D]/45 bg-[#C8AE7D]/15 px-3 text-xs font-bold text-[#C8AE7D] hover:bg-[#C8AE7D]/15"
                          >
                            <Radar className="h-3.5 w-3.5" />
                            <span>Yeni AI Girişimci Başvurusu Tara (81 İl)</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Incoming AI & Multiplayer Franchise Applications */}
            <section className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <UserCheck className="h-4 w-4 text-[#7A9E7E]" />
                  <span>Gelen Bayilik Başvuruları & Açılan Şubeler ({applications.length})</span>
                </div>
                <span className="text-xs text-slate-400">
                  Her onayda isim hakkı + sürekli telif
                </span>
              </div>

              {applications.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Markanızı yayınladığınızda 81 ilden AI girişimciler ve gerçek oyuncular otomatik
                  olarak bayilik başvurusu gönderecektir.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
                  {applications.slice(0, 8).map((app) => (
                    <div
                      key={app.id}
                      data-testid={`franchise-app-${app.id}`}
                      className={`flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-xs ${
                        app.status === 'approved'
                          ? 'border-[#7A9E7E]/45 bg-[#7A9E7E]/15'
                          : 'border-[#C8AE7D]/45 bg-[#C8AE7D]/15'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-bold text-white">{app.applicantName}</span>
                          <span className="rounded bg-[#1D2532] px-1.5 py-0.5 text-[10px] font-bold text-[#7E96B0]">
                            {app.applicantType === 'ai' ? 'AI Girişimci' : 'Oyuncu'}
                          </span>
                        </div>
                        <div className="truncate text-slate-300">
                          {app.brandName} · {String(app.cityPlate).padStart(2, '0')} {app.cityName} (
                          {app.districtName})
                        </div>
                        <div className="font-mono-num font-bold text-[#C8AE7D]">
                          +{formatTL(app.licenseFee, true)} · %{Math.round(app.royaltyRate * 100)}{' '}
                          ciro payı
                        </div>
                      </div>

                      {app.status === 'approved' ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#7A9E7E]/15 px-2.5 py-1 text-[11px] font-bold text-[#7A9E7E]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Açıldı
                        </span>
                      ) : (
                        onApproveFranchiseApp && (
                          <button
                            type="button"
                            data-testid={`approve-app-btn-${app.id}`}
                            onClick={() => onApproveFranchiseApp(app.id)}
                            className="min-h-[38px] shrink-0 rounded-xl bg-[#7A9E7E] px-3 text-xs font-bold text-[#181F29] hover:bg-[#7A9E7E] whitespace-nowrap"
                          >
                            Onayla (+{formatTL(app.licenseFee, true)})
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {subTab === 'market' && (
          <div className="grid grid-cols-1 gap-2.5 min-[900px]:grid-cols-2">
            {allFranchises.map((f) => (
              <div
                key={f.id}
                className="flex flex-col justify-between gap-2.5 rounded-xl border border-[#334155] bg-[#222B38] p-3"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <BrandLogo brandKey={f.id || f.brandName} size={40} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{f.brandName}</div>
                      <div className="truncate text-xs text-slate-400">
                        {f.ownerName} · {getBlueprintById(f.businessType)?.name}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#7A9E7E]/15 px-2 py-1 text-xs font-bold text-[#7A9E7E]">
                    <Sparkles className="h-3.5 w-3.5" /> +%35 Ciro
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-[#334155] pt-2 font-mono-num text-xs text-slate-300">
                  <span>Lisans: {formatTL(f.licenseFee)}</span>
                  <span className="font-bold text-[#C8AE7D]">
                    Pay: %{Math.round(f.royaltyRate * 100)}
                  </span>
                  <span className="text-slate-400">{f.branchCount} şube</span>
                </div>

                {onOpenFranchiseOnMap && (
                  <button
                    type="button"
                    onClick={() => onOpenFranchiseOnMap(f)}
                    className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#7A9E7E] px-3 text-xs font-bold text-[#181F29] hover:bg-[#7A9E7E]"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Haritada Bu Markadan Şube Aç</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {subTab === 'chain' && (
          <div className="space-y-3">
            {/* Cloned Zincir Markalar Summary */}
            <section className="rounded-xl border border-[#334155] bg-[#222B38] p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Link2 className="h-4 w-4 text-[#7E96B0]" />
                <span>Otomatik Zincir Markalarınız (2+ Şube)</span>
              </div>
              {brandGroups.filter((g) => g.isChain).length === 0 ? (
                <p className="text-xs text-slate-400">
                  İşletmelerim sekmesinden bir şubeyi <strong>"Şubeyi Çoğalt / Yeni Şube Aç"</strong>{' '}
                  ile çoğalttığınızda 2+ şubeli markanız otomatik Zincir Marka olur (-%12 tedarik
                  indirimi & +%10 marka ciro bonusu).
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
                  {brandGroups
                    .filter((g) => g.isChain)
                    .map((grp) => (
                      <div
                        key={grp.key}
                        className="flex items-center justify-between gap-2.5 rounded-xl border border-[#334155] bg-[#7E96B0]/15 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <BrandLogo brandKey={grp.brandName} size={38} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">
                              {grp.brandName}
                            </div>
                            <div className="text-xs text-slate-300">
                              {grp.branchCount} Şube · {getBlueprintById(grp.businessType)?.shortName}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-xs font-bold">
                          <div className="text-[#7A9E7E]">
                            -%{Math.round(grp.supplyDiscount * 100)} Tedarik
                          </div>
                          <div className="text-[#C8AE7D]">
                            +%{Math.round(grp.revenueBonus * 100)} Ciro
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* Industrial & Parking Synergy */}
            <section className="grid grid-cols-1 gap-2 min-[900px]:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#334155] bg-[#222B38] p-3">
                <Factory className="h-5 w-5 shrink-0 text-orange-400" />
                <div className="min-w-0 text-xs">
                  <div className="text-slate-400">Fabrika & Otopark Sinerjisi</div>
                  <div className="font-bold text-white">
                    {factoryCount > 0 ? `${factoryCount} Fabrika (%35 İndirim)` : 'Fabrika Yok'} ·{' '}
                    {parkingCount > 0 ? `${parkingCount} Otopark (+%15)` : 'Otopark Yok'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl border border-[#334155] bg-[#222B38] p-3">
                <Car className="h-5 w-5 shrink-0 text-[#7E96B0]" />
                <div className="min-w-0 text-xs">
                  <div className="text-slate-400">Toplam Franchise Telif Geliri</div>
                  <div className="font-mono-num text-sm font-black text-[#7A9E7E]">
                    {formatTL(state.franchiseRoyaltiesEarned ?? 0)}
                  </div>
                </div>
              </div>
            </section>

            {/* Supermarket Chain */}
            <section className="rounded-xl border border-[#334155] bg-[#222B38] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Store className="h-5 w-5 text-[#7A9E7E]" />
                <span>Süpermarket Zincir Ağı ({smCount}/{SUPERMARKET_CHAIN_MIN_COUNT})</span>
              </div>
              {state.supermarketChain ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#7A9E7E]/45 bg-[#7A9E7E]/15 p-3.5 text-xs text-[#7A9E7E]">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7A9E7E]" />
                  <div>
                    <div className="text-sm font-bold text-white">
                      Aktif Zincir Markanız: {state.supermarketChain.name}
                    </div>
                    <div>Tüm süpermarket şubelerinizde %20 toplu tedarik indirimi uygulanıyor.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={chainName}
                    onChange={(e) => setChainName(e.target.value)}
                    disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT}
                    placeholder="Örn: Anadolu Ekspres Marketler"
                    className="min-h-[42px] w-full rounded-xl border border-[#334155] bg-[#181F29] px-3 text-sm text-white disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={smCount < SUPERMARKET_CHAIN_MIN_COUNT || chainName.trim().length < 3}
                    onClick={() => {
                      onFormSupermarketChain(chainName.trim());
                      setChainName('');
                    }}
                    className="min-h-[44px] w-full rounded-xl bg-[#7A9E7E] px-4 text-sm font-bold text-[#181F29] hover:bg-[#7A9E7E] disabled:cursor-not-allowed disabled:bg-[#1D2532] disabled:text-slate-500"
                  >
                    Zincir Market Markasını Kur (%20 Tedarik İndirimi)
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </MobileGameModal>
    </div>
  );
}
