export type TuiAction = { id: string; label: string; command: string; args: string[]; };
export const developmentActions: TuiAction[] = [
  { id: 'doctor', label: 'Doctor / check host tools', command: 'bash', args: ['scripts/doctor.sh'] },
];
