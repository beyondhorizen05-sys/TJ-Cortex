export type AgentArchetype = 'strategist' | 'engineer' | 'researcher' | 'creative' | 'sales' | 'finance' | 'operations';

export interface AgentCharacterDefinition {
  id: AgentArchetype;
  label: string;
  shortLabel: string;
  modelPath: string;
  fallbackClass: string;
  personality: string;
  preferredStates: string[];
  animations: { idle: string; walk: string; work: string; meeting: string; speaking: string; offline: string };
}

export const AGENT_CHARACTERS: Record<AgentArchetype, AgentCharacterDefinition> = {
  strategist: { id:'strategist', label:'Strategist', shortLabel:'STR', modelPath:'/assets/crew/strategist.glb', fallbackClass:'strategist', personality:'Calm, analytical and mission-focused.', preferredStates:['planning','meeting','working'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  engineer: { id:'engineer', label:'Engineer', shortLabel:'ENG', modelPath:'/assets/crew/engineer.glb', fallbackClass:'engineer', personality:'Technical, precise and solution-oriented.', preferredStates:['working','building','debugging'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  researcher: { id:'researcher', label:'Researcher', shortLabel:'RES', modelPath:'/assets/crew/researcher.glb', fallbackClass:'researcher', personality:'Curious, observant and evidence-driven.', preferredStates:['researching','working','meeting'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  creative: { id:'creative', label:'Creative', shortLabel:'CRE', modelPath:'/assets/crew/creative.glb', fallbackClass:'creative', personality:'Imaginative, expressive and design-led.', preferredStates:['designing','creating','working'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  sales: { id:'sales', label:'Sales', shortLabel:'SAL', modelPath:'/assets/crew/sales.glb', fallbackClass:'sales', personality:'Social, persuasive and relationship-focused.', preferredStates:['selling','meeting','speaking'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  finance: { id:'finance', label:'Finance', shortLabel:'FIN', modelPath:'/assets/crew/finance.glb', fallbackClass:'finance', personality:'Methodical, careful and numbers-focused.', preferredStates:['auditing','working','reviewing'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
  operations: { id:'operations', label:'Operations', shortLabel:'OPS', modelPath:'/assets/crew/operations.glb', fallbackClass:'operations', personality:'Reliable, organized and execution-focused.', preferredStates:['operating','working','meeting'], animations:{idle:'Idle',walk:'Walk',work:'Working',meeting:'Meeting',speaking:'Talking',offline:'Offline'} },
};

export function resolveAgentArchetype(role: unknown, index = 0): AgentArchetype {
  const value = String(role ?? 'agent').toLowerCase();
  if (value.includes('research')) return 'researcher';
  if (value.includes('engineer') || value.includes('dev')) return 'engineer';
  if (value.includes('sales') || value.includes('growth')) return 'sales';
  if (value.includes('design') || value.includes('creative')) return 'creative';
  if (value.includes('finance') || value.includes('account')) return 'finance';
  return (['strategist','engineer','researcher','creative','operations'][index % 5] ?? 'operations') as AgentArchetype;
}

export function resolveAgentVisualState(state: unknown): keyof AgentCharacterDefinition['animations'] {
  const value = String(state ?? 'idle').toLowerCase();
  if (value.includes('offline')) return 'offline';
  if (value.includes('speak') || value.includes('voice')) return 'speaking';
  if (value.includes('meet')) return 'meeting';
  if (value.includes('work') || value.includes('research') || value.includes('design') || value.includes('build')) return 'work';
  if (value.includes('walk') || value.includes('move')) return 'walk';
  return 'idle';
}
