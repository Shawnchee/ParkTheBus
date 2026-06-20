import { MAX_PARLAY_LEGS } from '../config'
import { Close, Plus } from './Icon'

export default function ParlayBuilder({
  legs,
  setLegs,
}: {
  legs: string[]
  setLegs: (l: string[]) => void
}) {
  const update = (i: number, v: string) => setLegs(legs.map((l, idx) => (idx === i ? v : l)))
  const add = () => legs.length < MAX_PARLAY_LEGS && setLegs([...legs, ''])
  const remove = (i: number) => setLegs(legs.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {legs.map((leg, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="label w-10 shrink-0">L{i + 1}</span>
          <input
            className="input"
            value={leg}
            onChange={(e) => update(i, e.target.value)}
            placeholder="e.g. Brazil WIN / Ronaldo scores / Over 2.5 goals"
          />
          <button
            type="button"
            className="btn-ghost h-[42px] w-[42px] shrink-0 px-0"
            onClick={() => remove(i)}
            disabled={legs.length <= 2}
            aria-label="Remove leg"
            title={legs.length <= 2 ? 'A parlay needs at least 2 legs' : 'Remove leg'}
          >
            <Close size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-ghost text-sm"
        onClick={add}
        disabled={legs.length >= MAX_PARLAY_LEGS}
      >
        <Plus size={15} /> Add leg ({legs.length}/{MAX_PARLAY_LEGS})
      </button>
    </div>
  )
}
