"use client"

import { useState, useMemo } from 'react'
import { Trophy, Star, Ghost, Flame, Plus, Trash2, Edit3, X, CheckCircle2, Loader2, Coins, Clock, UserX, BarChart3, Crown, AlertTriangle, Award } from 'lucide-react'
import { createRanking, updateRanking, deleteRanking } from '@/actions/rankings'
import { useRouter } from 'next/navigation'

type Member = { id: string; alias: string; avatar: string | null; position: string }
type Ranking = { id: string; name: string; description: string; metric: string; visual_type: string }

const METRICS_INFO: Record<string, { label: string; icon: any; unit: string; bad: boolean }> = {
  'mvps': { label: 'Premios MVP', icon: Trophy, unit: 'MVPs', bad: false },
  'avg_rating': { label: 'Nota Media', icon: Star, unit: 'pts', bad: false },
  'matches_played': { label: 'Partidos Jugados', icon: Flame, unit: 'partidos', bad: false },
  'late_arrivals': { label: 'Tardanzas', icon: Clock, unit: 'tardes', bad: true },
  'no_shows': { label: 'Faltas Injustificadas', icon: UserX, unit: 'faltas', bad: true },
  'debts': { label: 'Partidos sin Pagar', icon: Coins, unit: 'deudas', bad: true }
}

export default function RankingsClient({
  communityId, isAdmin, members, initialRankings, evaluations, playerRecords
}: {
  communityId: string; isAdmin: boolean; members: Member[]; initialRankings: Ranking[]; evaluations: any[]; playerRecords: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rankingModal, setRankingModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; id?: string; name: string; description: string; metric: string; visual_type: string } | null>(null)
  
  const [positionFilters, setPositionFilters] = useState<Record<string, string>>({})

  const computedStats = useMemo(() => {
    const stats: Record<string, { mvps: number; totalRating: number; ratingVotes: number; matches: number; lates: number; noShows: number; debts: number }> = {}
    members.forEach(m => { stats[m.id] = { mvps: 0, totalRating: 0, ratingVotes: 0, matches: 0, lates: 0, noShows: 0, debts: 0 } })

    evaluations.forEach(ev => {
      if (stats[ev.evaluated_id]) {
        if (ev.is_mvp) stats[ev.evaluated_id].mvps += 1
        stats[ev.evaluated_id].totalRating += ev.rating
        stats[ev.evaluated_id].ratingVotes += 1
      }
    })

    playerRecords.forEach(rec => {
      if (stats[rec.member_id]) {
        stats[rec.member_id].matches += 1
        if (rec.attendance === 'LATE') stats[rec.member_id].lates += 1
        if (rec.attendance === 'NO_SHOW') stats[rec.member_id].noShows += 1
        if (!rec.has_paid) stats[rec.member_id].debts += 1
      }
    })
    return stats
  }, [members, evaluations, playerRecords])

  const processedRankings = useMemo(() => {
    return initialRankings.map(ranking => {
      const info = METRICS_INFO[ranking.metric]
      const leaderboard = members.map(m => {
        const playerStat = computedStats[m.id]
        let value = 0
        if (ranking.metric === 'mvps') value = playerStat.mvps
        else if (ranking.metric === 'matches_played') value = playerStat.matches
        else if (ranking.metric === 'late_arrivals') value = playerStat.lates
        else if (ranking.metric === 'no_shows') value = playerStat.noShows
        else if (ranking.metric === 'debts') value = playerStat.debts
        else if (ranking.metric === 'avg_rating') value = playerStat.ratingVotes > 0 ? parseFloat((playerStat.totalRating / playerStat.ratingVotes).toFixed(2)) : 0
        return { ...m, value }
      })
      leaderboard.sort((a, b) => b.value - a.value)
      return { ...ranking, leaderboard, info }
    })
  }, [initialRankings, members, computedStats])

  async function handleSubmitRanking(e: React.FormEvent) {
    e.preventDefault()
    if (!rankingModal) return
    setLoading(true)
    let res;
    if (rankingModal.mode === 'create') res = await createRanking(communityId, rankingModal)
    else res = await updateRanking(rankingModal.id!, communityId, rankingModal)
    setLoading(false)
    if (res?.error) alert(res.error)
    else { setRankingModal(null); router.refresh() }
  }

  async function handleDelete(id: string) {
    if (!confirm("🚨 ¿Seguro que quieres eliminar este ranking permanentemente?")) return
    setLoading(true)
    const res = await deleteRanking(id, communityId)
    setLoading(false)
    if (res?.error) alert(res.error)
    else router.refresh()
  }

  return (
    <div className="space-y-16">
      {isAdmin && (
        <div className="flex justify-end relative z-10 -mt-6">
          <button 
            onClick={() => setRankingModal({ isOpen: true, mode: 'create', name: '', description: '', metric: 'mvps', visual_type: 'podium' })}
            className="flex items-center gap-2 text-white font-black py-4 px-8 rounded-full transition-all transform hover:scale-105 border-2 border-white/20 uppercase tracking-widest shadow-lg"
            style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 60%, transparent)' }}
          >
            <Plus size={20} /> Forjar Ranking
          </button>
        </div>
      )}

      {processedRankings.map((rk) => {
        const top1 = rk.leaderboard[0] || null
        const top2 = rk.leaderboard[1] || null
        const top3 = rk.leaderboard[2] || null
        const isBad = rk.info?.bad

        const currentFilter = positionFilters[rk.id] || 'ALL'
        const filteredList = currentFilter === 'ALL' 
          ? rk.leaderboard 
          : rk.leaderboard.filter(p => p.position === currentFilter)

        const listPlayersForList = filteredList.slice(0, 10)
        const listPlayersForPodium = rk.leaderboard.slice(3, 10)
        
        return (
          <div 
            key={rk.id} 
            className="p-6 md:p-8 rounded-[2rem] bg-[#0f172a] shadow-2xl space-y-10 relative group overflow-hidden transition-all duration-500"
            style={{ border: `1px solid ${isBad ? '#dc2626' : 'color-mix(in srgb, var(--color-primary) 50%, transparent)'}` }}
          >
            <div 
              className="absolute top-0 right-0 w-[500px] h-[500px] blur-[100px] pointer-events-none transition-opacity opacity-10 group-hover:opacity-20"
              style={{ backgroundColor: isBad ? '#dc2626' : 'var(--color-primary)' }}
            ></div>

            <div className="flex justify-between items-start border-b border-slate-700/50 pb-6 relative z-10">
              <div className="flex items-center gap-4 md:gap-5">
                <div 
                  className="p-3 md:p-4 rounded-2xl shadow-lg flex items-center justify-center border shrink-0"
                  style={{ 
                    backgroundColor: isBad ? 'color-mix(in srgb, #ef4444 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    color: isBad ? '#ef4444' : 'var(--color-primary)',
                    borderColor: isBad ? 'color-mix(in srgb, #ef4444 30%, transparent)' : 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                    boxShadow: isBad ? '0 0 20px color-mix(in srgb, #ef4444 40%, transparent)' : '0 0 20px color-mix(in srgb, var(--color-primary) 40%, transparent)'
                  }}
                >
                  {rk.info && <rk.info.icon size={36} />}
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter" style={{ color: isBad ? '#ef4444' : 'var(--color-primary)' }}>
                    {rk.name}
                  </h3>
                  <p className="text-slate-400 font-medium text-xs md:text-sm mt-1">{rk.description}</p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setRankingModal({ isOpen: true, mode: 'edit', id: rk.id, name: rk.name, description: rk.description, metric: rk.metric, visual_type: rk.visual_type })} className="p-3 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-colors border border-slate-700">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(rk.id)} className="p-3 bg-slate-800 text-slate-400 hover:bg-red-900/50 hover:text-red-500 hover:border-red-800 rounded-xl transition-colors border border-slate-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* VISTA 1: PODIO METÁLICO */}
            {rk.visual_type === 'podium' && (
              <>
                <div className="flex flex-col md:flex-row items-center md:items-end justify-center gap-12 md:gap-8 pt-8 md:pt-24 pb-8 max-w-4xl mx-auto relative z-10">
                  {top2 && top2.value > 0 && (
                    <div className="w-[85%] max-w-[260px] md:max-w-none md:w-1/3 flex flex-col items-center order-2 md:order-1 relative group/podium transform hover:-translate-y-4 transition-transform duration-300">
                      <div className="relative md:absolute z-20 md:-top-16 -mb-10 md:mb-0">
                        {top2.avatar ? (
                          <img src={top2.avatar} alt={top2.alias} className="w-24 h-24 rounded-full object-cover border-[6px] border-slate-400 shadow-[0_0_20px_rgba(148,163,184,0.4)] bg-slate-800" />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-slate-800 border-[6px] border-slate-400 flex items-center justify-center font-black text-slate-400 text-3xl shadow-[0_0_20px_rgba(148,163,184,0.4)]">{top2.alias.charAt(0)}</div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-slate-300 to-slate-500 text-slate-900 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 border-slate-900 shadow-xl">2º</div>
                      </div>
                      <div className="bg-gradient-to-t from-slate-800 to-slate-700/50 border-2 md:border-0 md:border-t-[3px] border-slate-400 w-full h-36 md:h-32 pt-12 md:pt-0 rounded-3xl md:rounded-b-none md:rounded-t-2xl flex flex-col items-center justify-end pb-4 shadow-2xl relative overflow-hidden">
                        <p className="font-black text-lg text-white text-center truncate w-full px-4">{top2.alias}</p>
                        <span className="text-xs font-black text-slate-900 bg-slate-300 px-3 py-1 rounded-full mt-2 shadow-[0_0_10px_rgba(148,163,184,0.3)]">{top2.value} {rk.info?.unit}</span>
                      </div>
                    </div>
                  )}

                  {top1 && top1.value > 0 ? (
                    <div className="w-[90%] max-w-[300px] md:max-w-none md:w-1/3 flex flex-col items-center order-1 md:order-2 relative group/podium transform hover:-translate-y-6 transition-transform duration-300 z-30">
                      <div className="relative md:absolute md:-top-28 z-20 flex flex-col items-center -mb-12 md:mb-0">
                        {isBad ? (
                          <AlertTriangle className="text-red-500 mb-2 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" size={36} />
                        ) : (
                          <Crown className="mb-2" size={40} style={{ color: 'var(--color-primary)', filter: 'drop-shadow(0 0 10px var(--color-primary))' }} />
                        )}
                        <div className="relative">
                          {top1.avatar ? (
                            <img src={top1.avatar} alt={top1.alias} className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-[6px] bg-slate-900 relative z-10" style={{ borderColor: isBad ? '#dc2626' : 'var(--color-primary)', boxShadow: isBad ? '0 0 40px color-mix(in srgb, #ef4444 60%, transparent)' : '0 0 40px color-mix(in srgb, var(--color-primary) 60%, transparent)' }} />
                          ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-slate-900 border-[6px] flex items-center justify-center font-black text-5xl relative z-10" style={{ borderColor: isBad ? '#dc2626' : 'var(--color-primary)', color: isBad ? '#ef4444' : 'var(--color-primary)', boxShadow: isBad ? '0 0 40px color-mix(in srgb, #ef4444 60%, transparent)' : '0 0 40px color-mix(in srgb, var(--color-primary) 60%, transparent)' }}>{top1.alias.charAt(0)}</div>
                          )}
                          <div className="absolute -bottom-3 -right-3 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xl border-2 shadow-2xl z-20" style={{ backgroundColor: isBad ? '#dc2626' : 'var(--color-primary)', borderColor: '#0f172a' }}>1º</div>
                        </div>
                      </div>
                      <div className="w-full h-44 md:h-48 pt-16 md:pt-0 rounded-3xl md:rounded-b-none md:rounded-t-3xl border-2 md:border-0 md:border-t-[4px] flex flex-col items-center justify-end pb-6 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden" style={{ borderColor: isBad ? '#ef4444' : 'var(--color-primary)', backgroundColor: '#1e293b' }}>
                        <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(to top, transparent, color-mix(in srgb, ${isBad ? '#ef4444' : 'var(--color-primary)'} 50%, transparent))` }}></div>
                        <p className="font-black text-2xl md:text-3xl text-center truncate w-full px-4 relative z-10 text-white drop-shadow-md">{top1.alias}</p>
                        <span className="text-sm font-black px-5 py-1.5 rounded-full mt-2 relative z-10 shadow-lg border text-white" style={{ backgroundColor: isBad ? '#991b1b' : 'var(--color-primary)', borderColor: isBad ? '#fca5a5' : 'rgba(255,255,255,0.4)' }}>
                          {top1.value} {rk.info?.unit}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-sm font-medium border-2 border-dashed border-slate-700 rounded-3xl w-full h-40 flex flex-col items-center justify-center">No hay registros suficientes.</div>
                  )}

                  {top3 && top3.value > 0 && (
                    <div className="w-[85%] max-w-[260px] md:max-w-none md:w-1/3 flex flex-col items-center order-3 relative group/podium transform hover:-translate-y-4 transition-transform duration-300">
                      <div className="relative md:absolute z-10 md:-top-12 -mb-8 md:mb-0">
                        {top3.avatar ? (
                          <img src={top3.avatar} alt={top3.alias} className="w-20 h-20 rounded-full object-cover border-[6px] border-amber-700 shadow-[0_0_20px_rgba(180,83,9,0.4)] bg-slate-800" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-800 border-[6px] border-amber-700 flex items-center justify-center font-black text-amber-600 text-2xl shadow-[0_0_20px_rgba(180,83,9,0.4)]">{top3.alias.charAt(0)}</div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-amber-600 to-amber-800 text-white w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border-2 border-slate-900 shadow-xl">3º</div>
                      </div>
                      <div className="bg-gradient-to-t from-slate-800 to-slate-800/80 border-2 md:border-0 md:border-t-[3px] border-amber-700 w-full h-32 md:h-24 pt-10 md:pt-0 rounded-3xl md:rounded-b-none md:rounded-t-2xl flex flex-col items-center justify-end pb-3 shadow-2xl relative overflow-hidden">
                        <p className="font-bold text-sm text-white text-center truncate w-full px-4">{top3.alias}</p>
                        <span className="text-[10px] font-black text-amber-100 bg-amber-900/80 border border-amber-700 px-3 py-1 rounded-full mt-1">{top3.value} {rk.info?.unit}</span>
                      </div>
                    </div>
                  )}
                </div>

                {listPlayersForPodium.length > 0 && (
                  <div className="max-w-3xl mx-auto border-t border-slate-700/50 pt-8 space-y-3 relative z-10">
                    {listPlayersForPodium.map((player, idx) => {
                      if (player.value === 0) return null
                      return (
                        <div key={player.id} className="group/row flex items-center justify-between p-3 md:p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-700/80 transition-all border border-slate-700 hover:shadow-lg gap-2" style={{ ['--hover-border-color' as any]: isBad ? '#ef4444' : 'var(--color-primary)' }}>
                          <style jsx>{`.group\\/row:hover { border-color: var(--hover-border-color); }`}</style>
                          <div className="flex items-center gap-3 md:gap-6 min-w-0">
                            <span className="text-sm font-black text-slate-500 w-5 md:w-6 text-center group-hover/row:text-white transition-colors shrink-0">{idx + 4}</span>
                            {player.avatar ? (
                               <img src={player.avatar} alt={player.alias} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-600 group-hover/row:border-white transition-colors shrink-0" />
                            ) : (
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm border-2 border-slate-600 group-hover/row:border-white transition-colors shrink-0">{player.alias.charAt(0)}</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-black text-slate-200 text-base md:text-lg group-hover/row:text-white transition-colors leading-tight truncate">{player.alias}</p>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider truncate block">{player.position !== 'N/A' ? player.position : 'Sin Pos.'}</span>
                            </div>
                          </div>
                          
                          {/* CORRECCIÓN: flex en lugar de block, whitespace-nowrap, shrink-0 */}
                          <div className="text-right shrink-0">
                             <span className="inline-flex items-baseline gap-1 text-sm md:text-base font-black px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-sm border transition-colors whitespace-nowrap" style={{ backgroundColor: isBad ? 'color-mix(in srgb, #ef4444 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: '#ffffff', borderColor: isBad ? 'color-mix(in srgb, #ef4444 40%, transparent)' : 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
                               {player.value} <span className="text-[9px] md:text-[10px] uppercase font-bold opacity-70" style={{ color: isBad ? '#fca5a5' : 'color-mix(in srgb, var(--color-primary) 80%, white)' }}>{rk.info?.unit}</span>
                             </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* VISTA 2: LISTA CLASIFICATORIA */}
            {rk.visual_type === 'list' && (
              <div className="relative z-10 pt-4">
                <div className="flex flex-wrap justify-center gap-2 mb-8 bg-slate-900/50 p-2 rounded-2xl border border-slate-700/50 inline-flex mx-auto">
                  {['ALL', 'POR', 'DEF', 'MED', 'DEL'].map(pos => {
                    const isActive = currentFilter === pos;
                    return (
                      <button
                        key={pos}
                        onClick={() => setPositionFilters({ ...positionFilters, [rk.id]: pos })}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-all ${
                          isActive
                            ? (isBad ? 'bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[0_0_15px_color-mix(in srgb,var(--color-primary) 40%,transparent)]')
                            : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {pos === 'ALL' ? 'General' : pos}
                      </button>
                    )
                  })}
                </div>

                <div className="max-w-3xl mx-auto space-y-3">
                  {listPlayersForList.length > 0 ? (
                    listPlayersForList.map((player, idx) => {
                      if (player.value === 0) return null
                      return (
                        <div key={player.id} className="group/row flex items-center justify-between p-3 md:p-5 rounded-2xl bg-slate-800/50 hover:bg-slate-700/80 transition-all border border-slate-700 hover:shadow-lg gap-2" style={{ ['--hover-border-color' as any]: isBad ? '#ef4444' : 'var(--color-primary)' }}>
                          <style jsx>{`.group\\/row:hover { border-color: var(--hover-border-color); }`}</style>
                          <div className="flex items-center gap-3 md:gap-6 min-w-0">
                            <span className="text-sm font-black text-slate-500 w-5 md:w-6 text-center group-hover/row:text-white transition-colors shrink-0">{idx + 1}</span>
                            {player.avatar ? (
                               <img src={player.avatar} alt={player.alias} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-slate-600 group-hover/row:border-white transition-colors shrink-0" />
                            ) : (
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300 text-sm border-2 border-slate-600 group-hover/row:border-white transition-colors shrink-0">{player.alias.charAt(0)}</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-black text-slate-200 text-base md:text-lg group-hover/row:text-white transition-colors leading-tight truncate">{player.alias}</p>
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider truncate block">{player.position !== 'N/A' ? player.position : 'Sin Pos.'}</span>
                            </div>
                          </div>
                          
                          {/* CORRECCIÓN: flex en lugar de block, whitespace-nowrap, shrink-0 */}
                          <div className="text-right shrink-0">
                             <span className="inline-flex items-baseline gap-1 text-sm md:text-base font-black px-3 py-1.5 md:px-4 md:py-2 rounded-xl shadow-sm border transition-colors whitespace-nowrap" style={{ backgroundColor: isBad ? 'color-mix(in srgb, #ef4444 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)', color: '#ffffff', borderColor: isBad ? 'color-mix(in srgb, #ef4444 40%, transparent)' : 'color-mix(in srgb, var(--color-primary) 40%, transparent)' }}>
                               {player.value} <span className="text-[9px] md:text-[10px] uppercase font-bold opacity-70" style={{ color: isBad ? '#fca5a5' : 'color-mix(in srgb, var(--color-primary) 80%, white)' }}>{rk.info?.unit}</span>
                             </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 font-medium">No hay registros con esta posición.</div>
                  )}
                </div>
              </div>
            )}

            {/* VISTA 3: TOP #1 INDIVIDUAL */}
            {rk.visual_type === 'single' && (
              <div className="flex justify-center relative z-10 py-12 md:py-20">
                {top1 && top1.value > 0 ? (
                  <div className="flex flex-col items-center relative group/single transform hover:-translate-y-2 transition-transform duration-300">
                    {isBad ? (
                      <AlertTriangle className="text-red-500 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" size={56} />
                    ) : (
                      <Award className="mb-6" size={64} style={{ color: 'var(--color-primary)', filter: 'drop-shadow(0 0 20px var(--color-primary))' }} />
                    )}
                    <div className="relative">
                      {top1.avatar ? (
                        <img 
                          src={top1.avatar} 
                          className="w-48 h-48 md:w-56 md:h-56 rounded-full object-cover border-[8px] bg-slate-900 relative z-10" 
                          style={{ borderColor: isBad ? '#dc2626' : 'var(--color-primary)', boxShadow: isBad ? '0 0 60px color-mix(in srgb, #ef4444 60%, transparent)' : '0 0 60px color-mix(in srgb, var(--color-primary) 60%, transparent)' }} 
                        />
                      ) : (
                        <div 
                          className="w-48 h-48 md:w-56 md:h-56 rounded-full border-[8px] bg-slate-900 flex items-center justify-center text-7xl md:text-8xl font-black relative z-10" 
                          style={{ borderColor: isBad ? '#dc2626' : 'var(--color-primary)', color: isBad ? '#ef4444' : 'var(--color-primary)', boxShadow: isBad ? '0 0 60px color-mix(in srgb, #ef4444 60%, transparent)' : '0 0 60px color-mix(in srgb, var(--color-primary) 60%, transparent)' }}
                        >
                          {top1.alias.charAt(0)}
                        </div>
                      )}
                      <div 
                        className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-white px-8 py-2.5 rounded-full font-black text-xl md:text-2xl shadow-2xl border-4 border-[#0f172a] whitespace-nowrap z-20 uppercase tracking-widest" 
                        style={{ backgroundColor: isBad ? '#dc2626' : 'var(--color-primary)' }}
                      >
                        Nº 1 Absoluto
                      </div>
                    </div>
                    <div className="mt-10 bg-slate-800/80 px-12 pt-10 pb-8 rounded-[2.5rem] border-2 shadow-2xl flex flex-col items-center max-w-[90vw]" style={{ borderColor: isBad ? '#7f1d1d' : 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}>
                      <p className="text-3xl md:text-5xl font-black text-white drop-shadow-md mb-3 truncate w-full text-center">{top1.alias}</p>
                      <span className="inline-flex items-baseline gap-1 text-2xl md:text-3xl font-black px-6 py-2 rounded-xl border shadow-inner whitespace-nowrap" style={{ backgroundColor: isBad ? '#991b1b' : 'color-mix(in srgb, var(--color-primary) 20%, transparent)', color: isBad ? '#fecaca' : 'white', borderColor: isBad ? '#f87171' : 'color-mix(in srgb, var(--color-primary) 60%, transparent)' }}>
                        {top1.value} <span className="text-sm font-bold opacity-70">{rk.info?.unit}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm font-medium border-2 border-dashed border-slate-700 rounded-3xl w-full flex items-center justify-center min-h-[300px]">No hay registros suficientes.</div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {initialRankings.length === 0 && (
        <div className="p-16 text-center border-2 border-dashed border-slate-700 rounded-[2rem] bg-slate-900/50">
          <Trophy size={48} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium text-lg">No hay rankings forjados en esta comunidad.</p>
          <p className="text-slate-500 text-sm mt-2">Usa el botón de arriba para crear el primer ranking oficial.</p>
        </div>
      )}

      {/* MODAL DE EDICIÓN / CREACIÓN */}
      {rankingModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-700">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white border-b border-slate-700">
              <h3 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--color-primary)' }}><BarChart3 size={24}/> {rankingModal.mode === 'create' ? 'Forjar Ranking' : 'Editar Ranking'}</h3>
              <button onClick={() => setRankingModal(null)} className="text-slate-400 hover:text-white bg-slate-700/50 p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitRanking} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Nombre del Ranking</label>
                <input type="text" required placeholder="Ej: Balón de Oro..." value={rankingModal.name} onChange={e => setRankingModal({...rankingModal, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none focus:border-white transition-colors font-medium" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">Descripción corta</label>
                <input type="text" placeholder="Ej: Premio oficial a la regularidad de notas." value={rankingModal.description} onChange={e => setRankingModal({...rankingModal, description: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none focus:border-white transition-colors font-medium" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Métrica estadística</label>
                  <select value={rankingModal.metric} onChange={e => setRankingModal({...rankingModal, metric: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none focus:border-white transition-colors font-medium">
                    <option value="mvps">Premios MVP</option>
                    <option value="avg_rating">Nota Media</option>
                    <option value="matches_played">Partidos Jugados</option>
                    <option value="late_arrivals">Llegadas Tarde (Malo)</option>
                    <option value="no_shows">Faltas (Malo)</option>
                    <option value="debts">Impagos (Malo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-2">Diseño gráfico</label>
                  <select value={rankingModal.visual_type} onChange={e => setRankingModal({...rankingModal, visual_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 text-white focus:outline-none focus:border-white transition-colors font-medium">
                    <option value="podium">Podio Metálico (Top 3)</option>
                    <option value="list">Lista Clasificatoria (General o Filtrada)</option>
                    <option value="single">Top #1 (Solo al ganador/MVP)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full text-white font-black py-4 px-6 rounded-xl transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 20px color-mix(in srgb, var(--color-primary) 50%, transparent)' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}