// SPDX-License-Identifier: Apache-2.0
// GFTA6-AUDIO-001: pure mapping from deterministic combat receipts to
// presentation-only sound cues. No AudioContext or game-state mutation.
export function combatAudioCues(before,after) {
  if (!after) return Object.freeze([]);
  if (!before) return Object.freeze(['wave']);
  const cues=[];
  if (after.shots>before.shots) cues.push('gun');
  if (after.rack.launched>before.rack.launched) cues.push('missile');
  for(const effect of after.effects??[]) {
    if(effect.tick!==after.tick)continue;
    if(effect.kind==='hit')cues.push('hit');
    else if(effect.kind==='explosion')cues.push('explosion');
  }
  if(after.stage>before.stage)
    cues.push(after.status==='won'?'victory':'wave');
  return Object.freeze(cues);
}
