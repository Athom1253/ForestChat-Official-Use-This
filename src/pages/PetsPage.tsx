import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { toast } from '@/stores/toast'
import type { Pet, PetItem, PetAchievement, PetCollectible } from '@/types'
import { PetSprite, HeartParticles } from '@/components/pets/PetSprite'

type Environment = 'forest' | 'house' | 'aquarium' | 'garden' | 'sky' | 'cave' | 'meadow'

const SPECIES = [
  { id: 'forest_sprite', name: 'Forest Sprite', emoji: '🌿', color: '#4ade80', env: 'forest' as Environment },
  { id: 'leaf_fox', name: 'Leaf Fox', emoji: '🦊', color: '#f97316', env: 'forest' as Environment },
  { id: 'moss_bear', name: 'Moss Bear', emoji: '🐻', color: '#92400e', env: 'cave' as Environment },
  { id: 'mushroom_pal', name: 'Mushroom Pal', emoji: '🍄', color: '#dc2626', env: 'forest' as Environment },
  { id: 'firefly_sprite', name: 'Firefly Sprite', emoji: '✨', color: '#fbbf24', env: 'sky' as Environment },
  { id: 'river_otter', name: 'River Otter', emoji: '🦦', color: '#06b6d4', env: 'aquarium' as Environment },
  { id: 'puppy', name: 'Puppy', emoji: '🐶', color: '#d4a055', env: 'house' as Environment },
  { id: 'kitten', name: 'Kitten', emoji: '🐱', color: '#a78bfa', env: 'house' as Environment },
  { id: 'goldfish', name: 'Goldfish', emoji: '🐟', color: '#f59e0b', env: 'aquarium' as Environment },
  { id: 'bunny', name: 'Bunny', emoji: '🐰', color: '#fbcfe8', env: 'meadow' as Environment },
  { id: 'bird', name: 'Bird', emoji: '🐦', color: '#60a5fa', env: 'sky' as Environment },
  { id: 'dragon', name: 'Baby Dragon', emoji: '🐲', color: '#ef4444', env: 'cave' as Environment },
]

const ACHIEVEMENTS = [
  { id: 'first_steps', name: 'First Steps', desc: 'Adopt your first pet' },
  { id: 'well_fed', name: 'Well Fed', desc: 'Feed your pet 10 times' },
  { id: 'playful', name: 'Playful', desc: 'Play with your pet 10 times' },
  { id: 'level_5', name: 'Growing Up', desc: 'Reach level 5' },
  { id: 'level_10', name: 'Forest Guardian', desc: 'Reach level 10' },
  { id: 'happy_pet', name: 'Happy Pet', desc: 'Keep happiness above 90 for a day' },
]

const ACCESSORIES = [
  { id: 'hat', name: 'Top Hat', emoji: '🎩' },
  { id: 'bow', name: 'Bow Tie', emoji: '🎀' },
  { id: 'glasses', name: 'Glasses', emoji: '👓' },
  { id: 'scarf', name: 'Scarf', emoji: '🧣' },
  { id: 'crown', name: 'Crown', emoji: '👑' },
  { id: 'flower', name: 'Flower', emoji: '🌸' },
]

export default function PetsPage() {
  const { user } = useAuthStore()
  const [pet, setPet] = useState<Pet | null>(null)
  const [items, setItems] = useState<PetItem[]>([])
  const [achievements, setAchievements] = useState<PetAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showChangeSpecies, setShowChangeSpecies] = useState(false)
  const [showDress, setShowDress] = useState(false)
  const [petAction, setPetAction] = useState<'idle' | 'walking' | 'eating' | 'playing' | 'sleeping' | 'waking' | 'patted' | 'fetching'>('idle')
  const [petPos, setPetPos] = useState({ x: 50, y: 50 })
  const [petDirection, setPetDirection] = useState(1)
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([])
  const [ballPos, setBallPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 50, y: 70, visible: false })
  const [collectibles, setCollectibles] = useState<PetCollectible[]>([])
  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { loadPet() }, [user?.id])

  // Realtime subscription for pet updates
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('pet-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_pets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPet((prev) => prev ? { ...prev, ...payload.new as Pet } : prev)
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_items', filter: `owner_id=eq.${user.id}` },
        () => loadPet()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pet_collectibles', filter: `owner_id=eq.${user.id}` },
        () => loadCollectibles()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  useEffect(() => {
    if (!pet) return
    walkTimerRef.current = setInterval(() => {
      setPetPos((prev) => {
        const newX = prev.x + (Math.random() - 0.5) * 20
        const clampedX = Math.max(10, Math.min(90, newX))
        setPetDirection(clampedX > prev.x ? 1 : -1)
        return { x: clampedX, y: Math.max(20, Math.min(80, prev.y + (Math.random() - 0.5) * 10)) }
      })
      setPetAction(Math.random() > 0.7 ? 'walking' : 'idle')
    }, 3000)
    return () => { if (walkTimerRef.current) clearInterval(walkTimerRef.current) }
  }, [pet?.id])

  async function loadPet() {
    if (!user) return
    setLoading(true)
    const { data: petData } = await supabase.from('pets').select('*').eq('owner_id', user.id).maybeSingle()
    setPet(petData)
    if (petData) {
      const [{ data: itemsData }, { data: achData }] = await Promise.all([
        supabase.from('pet_items').select('*').eq('pet_id', petData.id),
        supabase.from('pet_achievements').select('*').eq('pet_id', petData.id),
      ])
      setItems(itemsData || [])
      setAchievements(achData || [])
      await loadCollectibles(petData.id)
    }
    setLoading(false)
  }

  async function loadCollectibles(petId?: string) {
    if (!user) return
    const pid = petId || pet?.id
    if (!pid) return
    const { data } = await supabase.from('pet_collectibles').select('*').eq('pet_id', pid).order('acquired_at', { ascending: false })
    setCollectibles(data || [])
  }

  const createPet = async (speciesId: string) => {
    if (!user) return
    const species = SPECIES.find((s) => s.id === speciesId)!
    const { data, error } = await supabase.from('user_pets').insert({
      user_id: user.id, name: species.name, species: speciesId, color_variant: species.color,
    }).select().single()
    if (error) { toast.error('Failed to create pet: ' + error.message); return }
    await supabase.from('pet_achievements').insert({
      pet_id: data.id, owner_id: user.id, achievement_id: 'first_steps', achievement_name: 'First Steps',
    })
    toast.success(`${species.name} adopted!`)
    setShowCreate(false)
    loadPet()
  }

  const feedPet = async () => {
    if (!pet || !user) return
    setPetAction('eating')
    const newHunger = Math.max(0, pet.hunger - 20)
    const newHappiness = Math.min(100, pet.happiness + 5)
    const newEnergy = Math.min(100, pet.energy + 10)
    const newXp = pet.xp + 5
    const newLevel = Math.floor(newXp / 100) + 1
    await supabase.from('user_pets').update({
      hunger: newHunger, happiness: newHappiness, energy: newEnergy, xp: newXp, level: newLevel,
      last_fed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', pet.id)
    setPet({ ...pet, hunger: newHunger, happiness: newHappiness, energy: newEnergy, xp: newXp, level: newLevel })
    toast.success(`${pet.name} enjoyed the food!`)
    setTimeout(() => setPetAction('idle'), 2000)
    await checkAchievements(newLevel, 'feed')
  }

  const playWithPet = async () => {
    if (!pet || !user) return
    if (pet.energy < 20) { toast.warning(`${pet.name} is too tired to play`); return }
    setPetAction('playing')
    const newHappiness = Math.min(100, pet.happiness + 15)
    const newEnergy = Math.max(0, pet.energy - 20)
    const newXp = pet.xp + 10
    const newLevel = Math.floor(newXp / 100) + 1
    await supabase.from('user_pets').update({
      happiness: newHappiness, energy: newEnergy, xp: newXp, level: newLevel,
      last_played_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', pet.id)
    setPet({ ...pet, happiness: newHappiness, energy: newEnergy, xp: newXp, level: newLevel })
    toast.success(`${pet.name} had fun playing!`)
    setTimeout(() => setPetAction('idle'), 2000)
    await checkAchievements(newLevel, 'play')
  }

  const sleepPet = async () => {
    if (!pet) return
    setPetAction('sleeping')
    const newEnergy = Math.min(100, pet.energy + 40)
    await supabase.from('user_pets').update({ energy: newEnergy, updated_at: new Date().toISOString() }).eq('id', pet.id)
    setPet({ ...pet, energy: newEnergy })
    toast.success(`${pet.name} is resting...`)
  }

  const wakePet = async () => {
    if (!pet) return
    setPetAction('waking')
    setTimeout(() => setPetAction('idle'), 1000)
    toast.success(`${pet.name} woke up!`)
  }

  const dressPet = async (accessoryId: string) => {
    if (!pet) return
    const acc = ACCESSORIES.find(a => a.id === accessoryId)!
    setPet({ ...pet, accessory: accessoryId })
    const accArray = accessoryId ? [accessoryId] : []
    await supabase.from('user_pets').update({ accessories: accArray }).eq('id', pet.id)
    toast.success(`${pet.name} is now wearing a ${acc.name}!`)
    setShowDress(false)
  }

  const patPet = async () => {
    if (!pet) return
    setPetAction('patted')
    const newHappiness = Math.min(100, pet.happiness + 5)
    setPet({ ...pet, happiness: newHappiness })
    const heartId = Date.now()
    setHearts((prev) => [...prev, { id: heartId, x: petPos.x + (Math.random() - 0.5) * 10, y: petPos.y - 10 }])
    setTimeout(() => setHearts((prev) => prev.filter((h) => h.id !== heartId)), 1500)
    setTimeout(() => setPetAction('idle'), 800)
    await supabase.from('user_pets').update({ happiness: newHappiness, updated_at: new Date().toISOString() }).eq('id', pet.id)
  }

  const throwBall = () => {
    if (!pet || petAction === 'fetching') return
    setBallPos({ x: 80, y: 70, visible: true })
    setPetAction('fetching')
    setPetDirection(1)
    setPetPos({ x: 75, y: 70 })
    setTimeout(() => {
      setPetAction('playing')
      setBallPos({ x: 75, y: 70, visible: false })
      setTimeout(() => {
        setPetDirection(-1)
        setPetPos({ x: 50, y: 50 })
        setTimeout(() => {
          setPetAction('idle')
          setPetDirection(1)
          const newHappiness = Math.min(100, pet.happiness + 10)
          setPet({ ...pet, happiness: newHappiness })
          supabase.from('user_pets').update({ happiness: newHappiness, updated_at: new Date().toISOString() }).eq('id', pet.id)
        }, 2000)
      }, 1000)
    }, 2000)
  }

  const equipCollectible = async (collectibleId: string) => {
    if (!pet) return
    const item = collectibles.find(c => c.id === collectibleId)
    if (!item) return
    if (item.is_equipped) {
      await supabase.from('pet_collectibles').update({ is_equipped: false }).eq('id', collectibleId)
      toast.success('Item unequipped')
    } else {
      await supabase.from('pet_collectibles').update({ is_equipped: false }).eq('pet_id', pet.id).eq('is_equipped', true).eq('category', item.category)
      await supabase.from('pet_collectibles').update({ is_equipped: true }).eq('id', collectibleId)
      toast.success('Item equipped!')
    }
    loadCollectibles()
  }

  const generateRandomCollectible = async () => {
    if (!pet || !user) return
    const categories: PetCollectible['category'][] = ['bed', 'collar', 'bowl', 'toy', 'furniture', 'decoration']
    const cat = categories[Math.floor(Math.random() * categories.length)]
    const names: Record<string, string[]> = {
      bed: ['Cozy Bed', 'Cloud Cushion', 'Royal Sleeper', 'Forest Nest'],
      collar: ['Leather Collar', 'Golden Chain', 'Berry Collar', 'Star Tag Collar'],
      bowl: ['Wooden Bowl', 'Ceramic Dish', 'Golden Bowl', 'Leaf Plate'],
      toy: ['Ball of Yarn', 'Squeaky Bone', 'Feather Wand', 'Rope Toy'],
      furniture: ['Cat Tree', 'Mini House', 'Window Perch', 'Cozy Hammock'],
      decoration: ['Flower Crown', 'Fairy Lights', 'Mushroom Lamp', 'Star Garland'],
    }
    const rarities: PetCollectible['rarity'][] = ['common', 'common', 'common', 'rare', 'rare', 'epic', 'legendary']
    const name = names[cat][Math.floor(Math.random() * names[cat].length)]
    const rarity = rarities[Math.floor(Math.random() * rarities.length)]
    const { error } = await supabase.from('pet_collectibles').insert({
      pet_id: pet.id, owner_id: user.id, category: cat, item_id: cat + '_' + Date.now(),
      item_name: name, rarity, is_equipped: false,
    })
    if (error) { toast.error('Failed to get item'); return }
    toast.success(`Found a ${rarity} ${name}!`)
    loadCollectibles()
  }

  const checkAchievements = async (level: number, action: 'feed' | 'play') => {
    if (!pet || !user) return
    const existing = new Set(achievements.map(a => a.achievement_id))
    const newAch: { id: string; name: string }[] = []
    if (level >= 5 && !existing.has('level_5')) newAch.push({ id: 'level_5', name: 'Growing Up' })
    if (level >= 10 && !existing.has('level_10')) newAch.push({ id: 'level_10', name: 'Forest Guardian' })
    if (pet.happiness >= 90 && !existing.has('happy_pet')) newAch.push({ id: 'happy_pet', name: 'Happy Pet' })
    // Count feed/play actions from xp (approximate)
    if (action === 'feed' && Math.floor(pet.xp / 5) >= 10 && !existing.has('well_fed')) newAch.push({ id: 'well_fed', name: 'Well Fed' })
    if (action === 'play' && Math.floor(pet.xp / 10) >= 10 && !existing.has('playful')) newAch.push({ id: 'playful', name: 'Playful' })
    for (const ach of newAch) {
      await supabase.from('pet_achievements').insert({
        pet_id: pet.id, owner_id: user.id, achievement_id: ach.id, achievement_name: ach.name,
      })
      toast.success(`Achievement unlocked: ${ach.name}!`)
    }
    if (newAch.length > 0) loadPet()
  }

  const renamePet = async () => {
    if (!pet) return
    const name = prompt('New name for your pet:', pet.name)
    if (!name || !name.trim()) return
    await supabase.from('user_pets').update({ name: name.trim() }).eq('id', pet.id)
    setPet({ ...pet, name: name.trim() })
    toast.success('Pet renamed!')
  }

  const changePetSpecies = async (speciesId: string) => {
    if (!pet) return
    const species = SPECIES.find((s) => s.id === speciesId)!
    await supabase.from('user_pets').update({ species: speciesId, color_variant: species.color }).eq('id', pet.id)
    setPet({ ...pet, species: speciesId, color: species.color })
    toast.success(`Your pet is now a ${species.name}!`)
    setShowChangeSpecies(false)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center page-bg">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="flex-1 flex flex-col page-bg">
        <div className="h-14 flex items-center px-6 border-b border-border bg-surface">
          <h1 className="text-lg font-semibold text-text">My Pet</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center text-5xl">🐾</div>
            <h2 className="text-xl font-semibold text-text mb-2">Adopt a Pet</h2>
            <p className="text-text-muted mb-6">Choose a companion to join you on your journey.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">Choose Your Pet</button>
          </div>
        </div>
        <AnimatePresence>
          {showCreate && (
            <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface border border-border rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-text mb-4">Choose a Species</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {SPECIES.map((s) => (
                    <button key={s.id} onClick={() => createPet(s.id)}
                      className="p-4 rounded-xl border-2 border-border hover:border-primary transition-all hover:scale-105 text-center">
                      <div className="text-4xl mb-2">{s.emoji}</div>
                      <p className="text-sm text-text">{s.name}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const species = SPECIES.find((s) => s.id === pet.species) || SPECIES[0]
  const moodEmoji = pet.mood === 'happy' ? '😊' : pet.mood === 'sad' ? '😢' : pet.mood === 'excited' ? '🤩' : pet.mood === 'sleepy' ? '😴' : '😐'
  const currentAccessory = pet.accessory ? ACCESSORIES.find(a => a.id === pet.accessory) : null

  return (
    <div className="flex-1 flex flex-col page-bg overflow-hidden">
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface">
        <h1 className="text-lg font-semibold text-text">My Pet</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowDress(true)} className="btn-ghost text-sm">Dress</button>
          <button onClick={() => setShowChangeSpecies(true)} className="btn-ghost text-sm">Change Species</button>
          <button onClick={renamePet} className="btn-ghost text-sm">Rename</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {/* Pet environment display */}
          <PetEnvironment species={species} petAction={petAction} petPos={petPos} petDirection={petDirection} accessoryEmoji={currentAccessory?.emoji} moodEmoji={moodEmoji} onPat={patPet} hearts={hearts} ballPos={ballPos} collectibles={collectibles} accessory={pet.accessory} />

          {/* Pet info */}
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl relative" style={{ backgroundColor: `${pet.color}30` }}>
                {species.emoji}
                {currentAccessory && <span className="absolute -top-2 -right-1 text-lg">{currentAccessory.emoji}</span>}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">{pet.name}</h2>
                <p className="text-sm text-text-muted">{species.name} · Level {pet.level}</p>
              </div>
            </div>
            <div className="space-y-3">
              <StatBar label="Energy" value={pet.energy} max={100} color="var(--color-warning)" />
              <StatBar label="Happiness" value={pet.happiness} max={100} color="var(--color-primary)" />
              <StatBar label="Hunger" value={pet.hunger} max={100} color="var(--color-error)" />
              <StatBar label="XP" value={pet.xp % 100} max={100} color="var(--color-accent)" labelExtra={`Level ${pet.level} · ${pet.xp % 100}/100 XP`} />
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button onClick={feedPet} className="btn-primary flex flex-col items-center gap-1 py-4">
              <span className="text-2xl">🍎</span><span className="text-sm">Feed</span>
            </button>
            <button onClick={playWithPet} className="btn-primary flex flex-col items-center gap-1 py-4">
              <span className="text-2xl">🎾</span><span className="text-sm">Play</span>
            </button>
            {petAction === 'sleeping' ? (
              <button onClick={wakePet} className="btn-primary flex flex-col items-center gap-1 py-4">
                <span className="text-2xl">⏰</span><span className="text-sm">Wake</span>
              </button>
            ) : (
              <button onClick={sleepPet} className="btn-primary flex flex-col items-center gap-1 py-4">
                <span className="text-2xl">😴</span><span className="text-sm">Sleep</span>
              </button>
            )}
            <button onClick={patPet} className="btn-primary flex flex-col items-center gap-1 py-4">
              <span className="text-2xl">🤚</span><span className="text-sm">Pat</span>
            </button>
            <button onClick={throwBall} className="btn-primary flex flex-col items-center gap-1 py-4">
              <span className="text-2xl">🥎</span><span className="text-sm">Fetch</span>
            </button>
            <button onClick={() => setShowDress(true)} className="btn-primary flex flex-col items-center gap-1 py-4">
              <span className="text-2xl">🎩</span><span className="text-sm">Dress</span>
            </button>
          </div>

          {/* Collectibles */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text">Collectibles ({collectibles.length})</h3>
              <button onClick={generateRandomCollectible} className="btn-primary text-sm px-4 py-2">
                ✨ Find Item
              </button>
            </div>
            {collectibles.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No collectibles yet. Click "Find Item" to discover one!</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {collectibles.map((c) => (
                  <div key={c.id} onClick={() => equipCollectible(c.id)} className={`p-2 rounded-lg text-center cursor-pointer transition-all hover:scale-105 ${c.is_equipped ? 'bg-primary/20 border-2 border-primary' : 'bg-bg'}`}>
                    <div className="text-2xl">{c.category === 'bed' ? '🛏️' : c.category === 'collar' ? '🔗' : c.category === 'bowl' ? '🥣' : c.category === 'toy' ? '🧸' : c.category === 'furniture' ? '🪑' : '🎀'}</div>
                    <p className="text-xs text-text-muted truncate">{c.item_name}</p>
                    <p className="text-xs capitalize" style={{ color: c.rarity === 'legendary' ? '#fbbf24' : c.rarity === 'epic' ? '#a855f7' : c.rarity === 'rare' ? '#3b82f6' : '#888' }}>{c.rarity}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inventory */}
          <div className="card p-4 mb-4">
            <h3 className="font-semibold text-text mb-3">Inventory ({items.length})</h3>
            {items.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No items yet. Play and feed your pet to earn items!</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {items.map((item) => (
                  <div key={item.id} className="p-2 bg-bg rounded-lg text-center">
                    <div className="text-2xl">{item.item_type === 'food' ? '🍎' : item.item_type === 'toy' ? '🎾' : item.item_type === 'accessory' ? '🎩' : '🧪'}</div>
                    <p className="text-xs text-text-muted truncate">{item.item_name}</p>
                    <p className="text-xs text-text-muted">x{item.quantity}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="card p-4">
            <h3 className="font-semibold text-text mb-3">Achievements ({achievements.length}/{ACHIEVEMENTS.length})</h3>
            <div className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = achievements.find((a) => a.achievement_id === ach.id)
                return (
                  <div key={ach.id} className={`p-3 rounded-lg ${unlocked ? 'bg-primary/10 border border-primary/30' : 'bg-bg opacity-50'}`}>
                    <p className="text-sm font-medium text-text">{unlocked ? '🏆' : '🔒'} {ach.name}</p>
                    <p className="text-xs text-text-muted">{ach.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Change Species Modal */}
      {showChangeSpecies && pet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowChangeSpecies(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-text mb-4">Change your pet's species</h2>
            <p className="text-sm text-text-muted mb-4">Pick a new species for {pet.name}. This will change their appearance and environment.</p>
            <div className="grid grid-cols-3 gap-3">
              {SPECIES.map((s) => (
                <button key={s.id} onClick={() => changePetSpecies(s.id)}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${pet.species === s.id ? 'border-primary bg-primary/10' : 'border-border bg-bg'}`}>
                  <div className="text-3xl mb-1">{s.emoji}</div>
                  <div className="text-xs text-text">{s.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowChangeSpecies(false)} className="btn-ghost w-full mt-4">Cancel</button>
          </motion.div>
        </div>
      )}

      {/* Dress Modal */}
      {showDress && pet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowDress(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-surface rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-text mb-4">Dress {pet.name}</h2>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => dressPet('')} className="p-4 rounded-xl border-2 border-border hover:border-primary text-center">
                <div className="text-3xl mb-1">🚫</div><div className="text-xs text-text">Remove</div>
              </button>
              {ACCESSORIES.map((a) => (
                <button key={a.id} onClick={() => dressPet(a.id)}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${pet.accessory === a.id ? 'border-primary bg-primary/10' : 'border-border bg-bg'}`}>
                  <div className="text-3xl mb-1">{a.emoji}</div><div className="text-xs text-text">{a.name}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowDress(false)} className="btn-ghost w-full mt-4">Close</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function PetEnvironment({ species, petAction, petPos, petDirection, accessoryEmoji, moodEmoji, onPat, hearts, ballPos, collectibles, accessory }: {
  species: typeof SPECIES[0], petAction: string, petPos: { x: number; y: number }, petDirection: number, accessoryEmoji?: string, moodEmoji: string, onPat: () => void, hearts: { id: number; x: number; y: number }[], ballPos: { x: number; y: number; visible: boolean }, collectibles: PetCollectible[], accessory?: string | null
}) {
  const env = species.env
  const equippedFurniture = collectibles.filter(c => c.is_equipped && (c.category === 'furniture' || c.category === 'bed' || c.category === 'bowl' || c.category === 'decoration' || c.category === 'toy'))

  return (
    <div className="card relative h-64 mb-6 overflow-hidden">
      {/* Environment backgrounds */}
      {env === 'forest' && (
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/40 via-green-800/20 to-green-950/40">
          {[...Array(8)].map((_, i) => (
            <motion.div key={i} className="absolute text-2xl opacity-30"
              style={{ left: `${(i * 13) % 100}%`, bottom: `${(i * 7) % 30}%` }}
              animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4 + i, delay: i * 0.3 }}>
              🌳
            </motion.div>
          ))}
        </div>
      )}
      {env === 'house' && (
        <div className="absolute inset-0 bg-gradient-to-b from-amber-100/20 to-orange-200/30 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-amber-200/30 dark:bg-amber-800/30 rounded-t-3xl" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl opacity-40">🪟</div>
          <div className="absolute bottom-12 right-8 text-3xl opacity-40">🛋️</div>
          <div className="absolute bottom-10 left-8 text-3xl opacity-40">🧸</div>
        </div>
      )}
      {env === 'aquarium' && (
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/30 via-blue-600/20 to-blue-900/40">
          {[...Array(6)].map((_, i) => (
            <motion.div key={i} className="absolute text-xl opacity-40"
              style={{ left: `${(i * 17 + 5) % 90}%`, top: `${(i * 11) % 70}%` }}
              animate={{ x: [0, 30, 0], y: [0, -15, 0] }}
              transition={{ repeat: Infinity, duration: 5 + i, delay: i * 0.5 }}>
              {i % 2 === 0 ? '🐠' : '🐟'}
            </motion.div>
          ))}
          {[...Array(4)].map((_, i) => (
            <motion.div key={`c${i}`} className="absolute bottom-0 text-2xl opacity-50"
              style={{ left: `${i * 25 + 10}%` }}
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: i * 0.4 }}>
              🪸
            </motion.div>
          ))}
          {[...Array(10)].map((_, i) => (
            <motion.div key={`b${i}`} className="absolute w-2 h-2 rounded-full bg-white/30"
              style={{ left: `${(i * 10 + 3) % 100}%`, bottom: `${(i * 13) % 80}%` }}
              animate={{ y: [0, -100, 0], opacity: [0, 0.6, 0] }}
              transition={{ repeat: Infinity, duration: 4 + (i % 3), delay: i * 0.2 }} />
          ))}
        </div>
      )}
      {env === 'meadow' && (
        <div className="absolute inset-0 bg-gradient-to-b from-pink-200/20 via-green-200/20 to-green-300/30 dark:from-pink-900/20 dark:via-green-900/20 dark:to-green-950/30">
          {[...Array(10)].map((_, i) => (
            <motion.div key={i} className="absolute text-lg opacity-50"
              style={{ left: `${(i * 11 + 2) % 100}%`, bottom: `${(i * 5) % 20}%` }}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3 + (i % 2), delay: i * 0.2 }}>
              {i % 3 === 0 ? '🌸' : i % 3 === 1 ? '🌼' : '🌷'}
            </motion.div>
          ))}
        </div>
      )}
      {env === 'sky' && (
        <div className="absolute inset-0 bg-gradient-to-b from-sky-300/20 via-sky-400/10 to-sky-600/20 dark:from-sky-900/30 dark:via-indigo-900/20 dark:to-indigo-950/30">
          {[...Array(5)].map((_, i) => (
            <motion.div key={i} className="absolute text-2xl opacity-30"
              style={{ left: `${(i * 20 + 5) % 100}%`, top: `${(i * 9) % 50}%` }}
              animate={{ x: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 6 + i, delay: i * 0.5 }}>
              ☁️
            </motion.div>
          ))}
        </div>
      )}
      {env === 'cave' && (
        <div className="absolute inset-0 bg-gradient-to-b from-stone-700/30 via-stone-800/40 to-stone-900/50">
          {[...Array(5)].map((_, i) => (
            <motion.div key={i} className="absolute text-xl opacity-40"
              style={{ left: `${(i * 19 + 3) % 100}%`, top: `${(i * 13) % 40}%` }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 + i, delay: i * 0.3 }}>
              💎
            </motion.div>
          ))}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-stone-800/40 rounded-t-3xl" />
        </div>
      )}

      {/* Equipped furniture/collectibles in the room */}
      {equippedFurniture.map((item, i) => {
        const positions = [
          { left: '8%', bottom: '4%' },
          { left: '82%', bottom: '4%' },
          { left: '20%', bottom: '2%' },
          { left: '72%', bottom: '2%' },
          { left: '45%', bottom: '1%' },
          { left: '12%', bottom: '18%' },
        ]
        const pos = positions[i % positions.length]
        const emoji = item.category === 'bed' ? '🛏️' : item.category === 'bowl' ? '🥣' : item.category === 'toy' ? '🧸' : item.category === 'furniture' ? '🪑' : item.category === 'decoration' ? '🌸' : '🎀'
        return (
          <div key={item.id} className="absolute pointer-events-none" style={pos}>
            <div className="relative">
              <span className="text-3xl" style={{ filter: item.rarity === 'legendary' ? 'drop-shadow(0 0 4px #fbbf24)' : item.rarity === 'epic' ? 'drop-shadow(0 0 3px #a855f7)' : 'none' }}>{emoji}</span>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-text-muted whitespace-nowrap opacity-60">{item.item_name}</span>
            </div>
          </div>
        )
      })}

      {/* Pet character */}
      <motion.div
        animate={{ left: `${petPos.x}%`, top: `${petPos.y}%` }}
        transition={{ duration: 2, ease: 'easeInOut' }}
        className="absolute"
        style={{ transform: `translate(-50%, -50%)` }}
      >
        <div className="relative" onClick={onPat}>
          <PetSprite species={mapSpecies(species.id)} color={species.color} action={petAction as any} direction={petDirection} size={100} accessory={accessory} />
          <HeartParticles hearts={hearts} />
        </div>
        {ballPos.visible && (
          <div className="absolute" style={{ left: `${ballPos.x}%`, top: `${ballPos.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="w-5 h-5 rounded-full bg-red-500" />
          </div>
        )}
      </motion.div>

      {/* Status badge */}
      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-bg/80 backdrop-blur rounded-full">
        <span className="text-lg">{moodEmoji}</span>
        <span className="text-sm text-text capitalize">{petAction}</span>
      </div>
    </div>
  )
}

function mapSpecies(id: string): string {
  if (id.includes('fox')) return 'fox'
  if (id.includes('bear')) return 'bear'
  if (id.includes('bunny') || id.includes('rabbit')) return 'rabbit'
  if (id.includes('puppy') || id.includes('dog')) return 'dog'
  if (id.includes('kitten') || id.includes('cat')) return 'cat'
  return 'cat'
}

function StatBar({ label, value, max, color, labelExtra }: { label: string; value: number; max: number; color: string; labelExtra?: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-muted">{label}</span>
        <span className="text-text">{labelExtra || `${value}/${max}`}</span>
      </div>
      <div className="h-2 bg-bg rounded-full overflow-hidden">
        <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }}
          className="h-full rounded-full" style={{ backgroundColor: color }} />
      </div>
    </div>
  )
}
