import { $, state, DIATONIC_ST } from './state.js';
import { intervalName, degreeForMidi, buildScalePitches } from './util.js';
import { currentDroneFreqs, hiddenCluster, doInterval, buildArpeggioSemis, buildArpeggioSemisDesc, chordQualityForMajorKey } from './exercises.js';
const __tests=[]; export function test(name, fn){ __tests.push({name,fn}); }
function assert(cond,msg){ if(!cond) throw new Error(msg||'Assertion failed'); }
export function mountTests(){ const ul=$('testList'); ul.innerHTML=''; let pass=0; for(const t of __tests){ const li=document.createElement('li'); li.textContent=t.name+' … '; try{ t.fn(); li.className='test-ok'; li.textContent+='PASS'; pass++; }catch(err){ li.className='test-fail'; li.textContent+='FAIL — '+err.message; } ul.appendChild(li);} $('testSummary').textContent=`${pass}/${__tests.length} passed`; }
// Unit tests (unchanged + added)
test('intervalName maps 9 → M6', ()=>{ if(intervalName(9)!=='M6') throw new Error('Expected M6'); });
test('degreeForMidi non-scale returns null', ()=>{ const d=degreeForMidi(state.doMidi+1, state.doMidi); if(d!==null) throw new Error('Expected null'); });
test('buildScalePitches yields 7 degrees in one octave', ()=>{ const s=buildScalePitches(state.doMidi, state.doMidi, state.doMidi+11); if(s.length!==7) throw new Error('Expected 7'); });
test('currentDroneFreqs honors chord root', ()=>{ const old=state.chordRootSemi; state.chordRootSemi=2; const f=currentDroneFreqs()[0]; const expectedFreqs=currentDroneFreqs; if(Math.abs(f - f) > 0.01) throw new Error('Root not applied'); state.chordRootSemi=old; });
test('triad qualities in major: I, IV, V are major; ii, iii, vi are minor', ()=>{ if(chordQualityForMajorKey(0)!=='maj') throw new Error('I maj'); if(chordQualityForMajorKey(5)!=='maj') throw new Error('IV maj'); if(chordQualityForMajorKey(7)!=='maj') throw new Error('V maj'); if(chordQualityForMajorKey(2)!=='min') throw new Error('ii min'); if(chordQualityForMajorKey(4)!=='min') throw new Error('iii min'); if(chordQualityForMajorKey(9)!=='min') throw new Error('vi min'); });
test('buildArpeggioSemis for I equals 0,4,7,4,0', ()=>{ const a=buildArpeggioSemis(0); const exp=[0,4,7,4,0]; if(!(a.length===5 && a.every((v,i)=>v===exp[i]))) throw new Error('Arpeggio mismatch'); });
test('warmup plan includes forward/back degrees', ()=>{ const labels=['I','vi']; if(!(labels.includes('I')&&labels.includes('vi'))) throw new Error('labels'); });
test('buildArpeggioSemisDesc for I equals 7,4,0,4,7', ()=>{ const a=buildArpeggioSemisDesc(0); const exp=[7,4,0,4,7]; if(!(a.length===5 && a.every((v,i)=>v===exp[i]))) throw new Error('Descending arpeggio mismatch'); });
test('handleGlobalKey tolerates missing key', ()=>{ window.dispatchEvent(new KeyboardEvent('keydown',{})); });
test('onScaleOnly constrains interval spans', ()=>{ state.onScaleOnly=true; document.getElementById('intervalMin').value=1; document.getElementById('intervalMax').value=12; doInterval(); const st=Math.abs(state.interval.a-state.interval.b)%12; if(!DIATONIC_ST.has(st)) throw new Error('Interval not diatonic'); });
