import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Moon, Pencil, Check, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Loader } from '../../components/ui';
import TopBar from '../../components/TopBar';
import { toast } from '../../lib/toast';
import { sameMuscle } from '../../lib/muscleNames';

type Day = { day: string; focus: string; groups: string[] };
const DAY_INDEX = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Schedule() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith('ar');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sched, isLoading } = useQuery({ queryKey: ['schedule'], queryFn: () => api.get('/api/me/schedule') });
  const { data: groups } = useQuery({ queryKey: ['muscle-groups'], queryFn: () => api.get('/api/muscle-groups') });

  const [edit, setEdit] = useState(false);
  const [days, setDays] = useState<Day[]>([]);
  useEffect(() => { if (sched?.schedule) setDays(sched.schedule); }, [sched]);

  const save = useMutation({
    mutationFn: () => api.patch('/api/me/schedule', { schedule: days }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedule'] }); setEdit(false); toast(t('schedule.saved'), 'success'); },
  });

  // scheduleJson stores ENGLISH day/group names; the display localizes them.
  // Group labels come from the API's own localized muscle groups (nameAr overlay),
  // matched via sameMuscle so «الصدر» and "Chest" are the same key.
  const dayLabel = (day: string) =>
    new Date(Date.UTC(2024, 0, 7 + DAY_INDEX.indexOf(day))).toLocaleDateString(i18n.language, { weekday: 'long' });

  const todayName = DAY_INDEX[new Date().getDay()];
  if (isLoading) return <Loader />;

  const groupNames: string[] = (groups ?? []).map((g: any) => g.name);
  const idFor = (name: string) => (groups ?? []).find((g: any) => sameMuscle(g.name, name))?.id;
  const labelFor = (name: string) => (groups ?? []).find((g: any) => sameMuscle(g.name, name))?.name ?? name;
  const startDay = (d: Day) => { const first = d.groups.map(idFor).find(Boolean); if (first) navigate(`/session/${first}`); };
  const setFocus = (i: number, v: string) => setDays((a) => a.map((d, k) => (k === i ? { ...d, focus: v } : d)));
  const toggleGroup = (i: number, name: string) =>
    setDays((a) => a.map((d, k) => (k === i ? { ...d, groups: d.groups.includes(name) ? d.groups.filter((x) => x !== name) : [...d.groups, name] } : d)));

  return (
    <div className="min-h-screen pb-10">
      <TopBar title={t('schedule.title')} color="fitness-hero" textColor="text-white" />

      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <p className="text-sm text-gray-400">{edit ? t('schedule.editHint') : t('schedule.subtitle')}</p>
        {edit ? (
          <div className="flex gap-2">
            <button onClick={() => { setDays(sched.schedule); setEdit(false); }} className="btn-pill btn-ghost px-4 py-2 text-sm"><X size={14} /> {t('common.cancel')}</button>
            <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-pill btn-primary px-4 py-2 text-sm"><Check size={14} /> {t('common.save')}</button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)} className="btn-pill btn-ghost px-4 py-2 text-sm"><Pencil size={14} /> {t('common.edit')}</button>
        )}
      </div>

      <div className="space-y-3 px-4 pt-2">
        {days.map((d, i) => {
          const isToday = d.day === todayName;
          const isRest = d.groups.length === 0;
          return (
            <div key={d.day} className={`overflow-hidden rounded-2xl bg-white shadow-sm ${isToday ? 'ring-2 ring-brand-pink' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <span className={`text-xs font-bold uppercase ${isToday ? 'text-brand-pink' : 'text-gray-400'}`}>
                    {dayLabel(d.day)}{isToday ? ` · ${t('tracker.today')}` : ''}
                  </span>
                  {edit ? (
                    <input value={d.focus} onChange={(e) => setFocus(i, e.target.value)} placeholder={t('schedule.focusPh')} className="input-field mt-1 py-2" />
                  ) : (
                    <>
                      <p className="font-semibold">
                        {isRest
                          ? t('today.restDay')
                          : isAr
                            ? d.groups.map(labelFor).join(' + ')
                            : d.focus || d.groups.map(labelFor).join(' + ')}
                      </p>
                      {!isRest && <p className="mt-0.5 text-xs text-gray-400">{d.groups.map(labelFor).join(' · ')}</p>}
                    </>
                  )}
                </div>
                {!edit && (isRest ? (
                  <span className="flex items-center gap-1 text-sm text-gray-400"><Moon size={16} /> {t('today.restDay')}</span>
                ) : (
                  <button onClick={() => startDay(d)} className="btn-pill btn-primary px-5 py-2 text-sm"><Play size={14} /> {t('today.start')}</button>
                ))}
              </div>

              {edit && (
                <div className="flex flex-wrap gap-1.5 border-t border-gray-100 p-3">
                  {groupNames.map((name) => {
                    const on = d.groups.includes(name);
                    return (
                      <button key={name} onClick={() => toggleGroup(i, name)} className={`rounded-full px-3 py-1 text-xs font-medium ${on ? 'btn-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
