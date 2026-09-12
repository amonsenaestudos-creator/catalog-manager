import { useMemo, useState } from 'react';
import { Award, CalendarDays, Camera, Crown, Eye, Flame, Heart, Images, MapPin, NotebookPen, Sparkles, Swords, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { useCatalog } from '../context';
import { calculateOverallRating, formatDate, formatNumber, getFinalScore, isActive, rarityFor, RARITIES, RARITY_COLORS, RARITY_LABELS, today } from '../store';
import { ageBands, averageRadar, categoryBattle, categoryBreakdown, catalogSummary, championOfMonth, duelRanking, geoGroups, heightDistribution, monthlyActivity, monthlyReport, ratingBands, ratingTrend } from '../lib/stats';
import { streakInfo, weeklyChallenges } from '../lib/progress';
import { Avatar, Button, EmptyState, PageTitle, SectionHeading } from './ui';
import { BarList, Donut, ProgressRing, Radar, Sparkline, StatCard } from './Charts';
import StarRating from './StarRating';

export default function Dashboard() {
  const ctx = useCatalog(), { data } = ctx;
  const summary = useMemo(() => catalogSummary(data), [data]);
  const categories = useMemo(() => categoryBreakdown(data), [data]);
  const battle = useMemo(() => categoryBattle(data), [data]);
  const champion = useMemo(() => championOfMonth(data), [data]);
  const report = useMemo(() => monthlyReport(data), [data]);
  const activity = useMemo(() => monthlyActivity(data, 6), [data]);
  const places = useMemo(() => geoGroups(data), [data]);
  const duels = useMemo(() => duelRanking(data).slice(0, 6), [data]);
  const trend = useMemo(() => ratingTrend(data), [data]);
  const challenges = useMemo(() => weeklyChallenges(data), [data]);
  const streak = streakInfo(data);
  const [radarPerson, setRadarPerson] = useState('');
  const radarCandidates = useMemo(() => data.people.filter(p => isActive(p) && calculateOverallRating(p.rating) > 0).sort((a, b) => getFinalScore(b) - getFinalScore(a)).slice(0, 30), [data.people]);
  const radarTarget = radarCandidates.find(p => p.id === radarPerson) || radarCandidates[0];
  const axes = averageRadar(data).map(item => item.label);

  if (!data.people.length) return <div className="dashboard-page"><PageTitle eyebrow="Visão geral" title="Painel" description="Seus números, gráficos e conquistas em um só lugar." /><EmptyState icon={TrendingUp} title="O painel acende com a primeira ficha" description="Adicione pessoas, fotos e histórias para ver gráficos, médias e conquistas aqui." action="Adicionar pessoa" onAction={() => ctx.navigate('add')} /></div>;

  return <div className="dashboard-page">
    <PageTitle eyebrow="Visão geral" title="Painel" description="Tudo o que o seu catálogo conta sobre si mesmo.">
      <Button onClick={() => ctx.navigate('catalog')}><Users size={16} />Ver catálogo</Button>
      <Button variant="primary" onClick={() => ctx.navigate('discover')}><Sparkles size={16} />Descobrir</Button>
    </PageTitle>

    <section className="level-banner">
      <ProgressRing value={ctx.level.progress} size={86} label={`N${ctx.level.level}`} />
      <div className="level-copy">
        <p className="eyebrow">{ctx.level.title}</p>
        <h2>Nível {ctx.level.level} · {ctx.xp.toLocaleString('pt-BR')} XP</h2>
        <p>Faltam {ctx.level.next.toLocaleString('pt-BR')} XP para o nível {ctx.level.level + 1}. Você ganha pontos cadastrando, fotografando, escrevendo e concluindo metas.</p>
        <div className="level-badges">
          <span><Flame size={13} />{streak.count} {streak.count === 1 ? 'dia seguido' : 'dias seguidos'}</span>
          <span><Award size={13} />{Object.keys(data.progress.achievements).length}/{ctx.achievements.length} conquistas</span>
          <span><Swords size={13} />{data.progress.duels.length} duelos</span>
        </div>
      </div>
      <div className="level-challenges">
        <h3><Target size={15} />Desafios da semana</h3>
        <ul>{challenges.challenges.slice(0, 4).map(challenge => <li key={challenge.id} className={challenge.progress >= challenge.target ? 'done' : ''}>
          <span>{challenge.title}</span><i><b style={{ width: `${Math.min(100, challenge.progress / challenge.target * 100)}%` }} /></i><small>{challenge.progress}/{challenge.target}</small>
        </li>)}</ul>
      </div>
    </section>

    <div className="stat-grid">
      <StatCard icon={Users} label="Pessoas ativas" value={summary.people} hint={`${summary.favorites} favoritas · ${summary.archived} arquivadas`} />
      <StatCard icon={Images} label="Fotos guardadas" value={summary.photos} hint={`${summary.photoFavorites} favoritas`} />
      <StatCard icon={NotebookPen} label="Histórias" value={summary.stories} hint={`${summary.notes} anotações`} />
      <StatCard icon={Trophy} label="Média geral" value={formatNumber(summary.averageRating)} hint={`${summary.rated} fichas avaliadas`} />
      <StatCard icon={CalendarDays} label="Idade média" value={summary.averageAge ? formatNumber(summary.averageAge) : '—'} hint={summary.topHeight ? `Altura mais comum: ${summary.topHeight.label}` : 'Altura não informada'} />
      <StatCard icon={Heart} label="Interações" value={summary.interactions} hint={`${summary.pendingReminders} lembretes em aberto`} />
    </div>

    <div className="dashboard-grid">
      <section className="panel"><SectionHeading icon={Users} title="Pizza por categoria" /><Donut slices={categories.slice(0, 8).map(slice => ({ label: slice.label, value: slice.value }))} centerLabel="categorias" centerValue={categories.length} /></section>
      <section className="panel"><SectionHeading icon={Trophy} title="Barras por faixa de nota" /><BarList items={ratingBands(data).map(band => ({ label: `${band.label} estrelas`, value: band.value }))} /><h3 className="panel-subtitle">Faixas de idade</h3><BarList items={ageBands(data).filter(band => band.value > 0).map(band => ({ label: `${band.label} anos`, value: band.value }))} /></section>
      <section className="panel"><SectionHeading icon={Sparkles} title="Radar de atributos" />
        <Radar axes={axes} series={[{ name: 'Média do catálogo', values: averageRadar(data).map(item => item.value) }, ...(radarTarget ? [{ name: radarTarget.nome, values: Array.from({ length: axes.length }, (_, index) => radarTarget.rating[(['peitos', 'bunda', 'rosto', 'belezaGeral', 'corpo', 'cabelo', 'comportamento', 'quadril'] as const)[index]] || 0) }] : [])]} />
        {radarCandidates.length > 1 && <select value={radarTarget?.id || ''} onChange={e => setRadarPerson(e.target.value)} aria-label="Comparar radar com uma pessoa"><option value="">Comparar com a média</option>{radarCandidates.map(person => <option key={person.id} value={person.id}>{person.nome}</option>)}</select>}
      </section>
      <section className="panel"><SectionHeading icon={Swords} title="Batalha de categorias" action="Ver ranking" onAction={() => ctx.navigate('ranking')} />
        {battle.length ? <ol className="battle-list">{battle.map((entry, index) => <li key={entry.label}><b>{index + 1}º</b><span>{entry.label}<small>{entry.count} pessoas</small></span><strong>{formatNumber(entry.avg)}</strong></li>)}</ol> : <p className="form-help">Avalie algumas pessoas para comparar as origens.</p>}
        <h3 className="panel-subtitle">Altura mais comum</h3><BarList items={heightDistribution(data).map(item => ({ label: item.label, value: item.value }))} />
      </section>
      <section className="panel panel-highlight"><SectionHeading icon={Crown} title="Campeã do mês" />
        {champion.top ? <div className="champion-card">
          <button onClick={() => ctx.openPerson(champion.top!)}><Avatar person={champion.top} size={72} /></button>
          <div><h3>{champion.top.nome}</h3><StarRating value={calculateOverallRating(champion.top.rating)} readonly size={15} /><span className={`rarity-chip rarity-${rarityFor(calculateOverallRating(champion.top.rating))}`}>{RARITY_LABELS[rarityFor(calculateOverallRating(champion.top.rating))]}</span></div>
          <strong>{formatNumber(getFinalScore(champion.top))}</strong>
        </div> : <p className="form-help">Nenhuma ficha avaliada ainda.</p>}
        {champion.mostSeen && <p className="panel-note"><Eye size={13} />Mais vista em {today().slice(0, 7).split('-').reverse().join('/')}: <button onClick={() => ctx.openPerson(champion.mostSeen!.person)}>{champion.mostSeen.person.nome}</button> ({champion.mostSeen.count} interações)</p>}
      </section>
      <section className="panel"><SectionHeading icon={CalendarDays} title="Relatório do mês" /><div className="report-numbers">
        <div><strong>{report.added}</strong><span>pessoas adicionadas</span></div>
        <div><strong>{report.interactions}</strong><span>interações registradas</span></div>
        <div><strong>{report.photos}</strong><span>fotos novas</span></div>
        <div><strong>{report.goals}</strong><span>metas concluídas</span></div>
      </div>
        <p className="panel-note">{report.growth >= 0 ? `Crescimento de ${report.growth}% em cadastros contra o mês passado.` : `Queda de ${Math.abs(report.growth)}% em cadastros contra o mês passado.`}</p>
        <h3 className="panel-subtitle">Adições e interações por mês</h3>
        <BarList items={activity.map(month => ({ label: month.label, value: month.added, hint: `${month.interactions} interações` }))} />
      </section>
      <section className="panel"><SectionHeading icon={TrendingUp} title="Histórico de notas" /><Sparkline values={trend.map(point => point.overall)} />
        <p className="panel-note">{trend.length ? `Última atualização em ${formatDate(trend[trend.length - 1].date)}.` : 'As mudanças de avaliação aparecem aqui conforme você edita as fichas.'}</p>
      </section>
      <section className="panel"><SectionHeading icon={MapPin} title="Mapa por bairro e cidade" action="Ver catálogo" onAction={() => ctx.navigate('catalog')} />
        {places.length ? <div className="geo-list">{places.slice(0, 10).map(place => <button key={place.place} onClick={() => { ctx.setFilter({ ...ctx.filter, scope: 'active', query: place.place }); ctx.navigate('catalog'); }}>
          <span><MapPin size={13} />{place.place}</span><b>{place.count}</b><small>{place.avg ? `${formatNumber(place.avg)} média` : 'sem nota'}</small>
        </button>)}</div> : <p className="form-help">Preencha “Onde mora” nas fichas para agrupar por lugar.</p>}
      </section>
      <section className="panel"><SectionHeading icon={Swords} title="Placar do This or That" action="Duelar" onAction={() => ctx.navigate('discover')} />
        {duels.length ? <ol className="duel-list">{duels.map((entry, index) => <li key={entry.person!.id}><b>{index + 1}º</b><Avatar person={entry.person!} size={30} /><span>{entry.person!.nome}</span><strong>{entry.wins} vitórias</strong></li>)}</ol> : <p className="form-help">Faça duelos no modo Descobrir para montar este placar.</p>}
      </section>
      <section className="panel"><SectionHeading icon={Award} title="Raridades do catálogo" />
        <div className="rarity-grid">{RARITIES.map(value => { const count = summary.rarity.find(item => item.value === value)?.count || 0; return <div key={value} className="rarity-card" style={{ borderColor: RARITY_COLORS[value] }}><strong style={{ color: RARITY_COLORS[value] }}>{count}</strong><span>{RARITY_LABELS[value]}</span></div>; })}</div>
        <h3 className="panel-subtitle">Conquistas recentes</h3>
        <div className="achievement-strip">{ctx.achievements.filter(entry => entry.unlocked).slice(-6).map(entry => <span key={entry.def.id} title={entry.def.description}><Award size={13} />{entry.def.title}</span>)}{!ctx.achievements.some(entry => entry.unlocked) && <p className="form-help">Nenhuma conquista ainda. Continue usando o catálogo.</p>}</div>
      </section>
      <section className="panel"><SectionHeading icon={Camera} title="Organização" />
        <BarList items={[{ label: 'Pastas', value: summary.folders }, { label: 'Álbuns', value: summary.albums }, { label: 'Lembretes em aberto', value: summary.pendingReminders }, { label: 'Compromissos agendados', value: summary.appointments }, { label: 'Fichas na lixeira', value: summary.trash }]} />
        <p className="panel-note">Completude média das fichas: {summary.completenessAvg}%.</p>
      </section>
    </div>
  </div>;
}
