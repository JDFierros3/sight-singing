/**
 * Music Theory content - Comprehensive Solfege and Shape Note Learning Path
 * This content is displayed in the Music Theory tab
 */

export function renderTheoryContent() {
  const panel = document.getElementById('panel-theory');
  if (!panel) return;

  panel.innerHTML = `
    <div class="theory-content">
      <h1>Solfege and Shape Note Learning Path</h1>
      <p class="theory-intro">
        This learning path guides you from complete beginner to singing harmony parts.
        Start with Lesson 1 to learn the shapes, then work through each lesson in order.
      </p>
      <p class="theory-intro" style="margin-top: 15px; padding: 12px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid var(--warn); border-radius: 4px;">
        <strong>Note:</strong> On large screens (desktop/tablet), the theory content appears as a resizable sidebar 
        that you can adjust by dragging the divider. On phones, it displays as a regular tab for easier scrolling. 
        The sidebar width is saved and will be remembered for your next visit.
      </p>


      ${renderLesson1()}
      ${renderLesson2()}
      ${renderLesson3()}
      ${renderLesson4()}
      ${renderLesson5()}
      ${renderLesson6()}
      ${renderLesson7()}
      ${renderBenchmarkTracking()}
    </div>
  `;

  // Setup lesson collapse/expand functionality
  setupLessonCollapse();
}


function setupLessonCollapse() {
  // Load saved expanded state
  const savedExpanded = loadExpandedLessons();

  // On first visit (no saved state), auto-expand Lesson 1 and Sub-lesson 1.1
  const isFirstVisit = !localStorage.getItem('theory-expanded-lessons-v2');
  if (isFirstVisit) {
    savedExpanded.lessons.push('1');
    savedExpanded.subLessons.push('1.1');
  }
  
  // All lessons start collapsed (unless saved state says otherwise)
  const lessonHeaders = document.querySelectorAll('.lesson-header');
  
  lessonHeaders.forEach(header => {
    const lessonNumber = header.dataset.lessonToggle;
    const content = document.querySelector(`[data-lesson-content="${lessonNumber}"]`);
    const icon = header.querySelector('.lesson-toggle-icon');
    
    if (content) {
      // Check if this lesson should be expanded based on saved state
      const shouldBeExpanded = savedExpanded.lessons.includes(lessonNumber);
      content.style.display = shouldBeExpanded ? 'block' : 'none';
      if (icon) {
        icon.textContent = shouldBeExpanded ? '▼' : '▶';
      }
      if (shouldBeExpanded) {
        header.parentElement.classList.add('lesson-expanded');
      }
    }
    
    // Toggle on click
    header.addEventListener('click', () => {
      if (content) {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        if (icon) {
          icon.textContent = isExpanded ? '▶' : '▼';
        }
        header.parentElement.classList.toggle('lesson-expanded', !isExpanded);
        
        // Save expanded state
        saveExpandedLessons();
      }
    });
    
    // Make header look clickable
    header.style.cursor = 'pointer';
  });
  
  // All sub-lessons start collapsed (unless saved state says otherwise)
  const subLessonHeaders = document.querySelectorAll('.sub-lesson-header');
  
  subLessonHeaders.forEach(header => {
    const subLessonNumber = header.dataset.subLessonToggle;
    const content = document.querySelector(`[data-sub-lesson-content="${subLessonNumber}"]`);
    const icon = header.querySelector('.sub-lesson-toggle-icon');
    
    if (content) {
      // Check if this sub-lesson should be expanded based on saved state
      const shouldBeExpanded = savedExpanded.subLessons.includes(subLessonNumber);
      content.style.display = shouldBeExpanded ? 'block' : 'none';
      if (icon) {
        icon.textContent = shouldBeExpanded ? '▼' : '▶';
      }
      if (shouldBeExpanded) {
        header.parentElement.classList.add('sub-lesson-expanded');
      }
    }
    
    // Toggle on click
    header.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent parent lesson from toggling
      if (content) {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'block';
        if (icon) {
          icon.textContent = isExpanded ? '▶' : '▼';
        }
        header.parentElement.classList.toggle('sub-lesson-expanded', !isExpanded);
        
        // Save expanded state
        saveExpandedLessons();
      }
    });
    
    // Make header look clickable
    header.style.cursor = 'pointer';
  });
}

function loadExpandedLessons() {
  try {
    const saved = localStorage.getItem('theory-expanded-lessons-v2');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load expanded lessons state:', e);
  }
  return { lessons: [], subLessons: [] };
}

/**
 * Expand a specific lesson by number and scroll it into view.
 * Call after the theory content is rendered and visible.
 */
export function expandAndScrollToLesson(lessonNumber) {
  const lessonStr = String(lessonNumber);
  const header = document.querySelector(`[data-lesson-toggle="${lessonStr}"]`);
  const content = document.querySelector(`[data-lesson-content="${lessonStr}"]`);
  if (!header || !content) return;

  // Expand if collapsed
  if (content.style.display === 'none') {
    content.style.display = 'block';
    const icon = header.querySelector('.lesson-toggle-icon');
    if (icon) icon.textContent = '▼';
    header.parentElement.classList.add('lesson-expanded');
    saveExpandedLessons();
  }

  // Scroll into view — use the lesson section element
  const section = document.getElementById(`lesson-${lessonStr}`);
  if (section) {
    // Scroll within the sidebar if it's in sidebar mode, otherwise within main content
    const sidebar = document.getElementById('theory-sidebar');
    if (sidebar && document.body.classList.contains('theory-sidebar-active') && sidebar.contains(section)) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

export function saveExpandedLessons() {
  try {
    const lessons = [];
    const subLessons = [];
    
    // Find all expanded lessons
    document.querySelectorAll('.lesson-content').forEach(content => {
      if (content.style.display !== 'none') {
        const lessonNumber = content.dataset.lessonContent;
        if (lessonNumber) {
          lessons.push(lessonNumber);
        }
      }
    });
    
    // Find all expanded sub-lessons
    document.querySelectorAll('.sub-lesson-content').forEach(content => {
      if (content.style.display !== 'none') {
        const subLessonNumber = content.dataset.subLessonContent;
        if (subLessonNumber) {
          subLessons.push(subLessonNumber);
        }
      }
    });
    
    localStorage.setItem('theory-expanded-lessons-v2', JSON.stringify({
      lessons,
      subLessons
    }));
  } catch (e) {
    console.warn('Failed to save expanded lessons state:', e);
  }
}

function renderLesson1() {
  return `
    <section class="lesson" id="lesson-1" data-lesson="1">
      <div class="lesson-header" data-lesson-toggle="1">
        <h2>Lesson 1: Shape Notes &amp; Solfege</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="1">
        <p class="lesson-goal"><strong>Goal:</strong> Master shape note recognition and basic solfege understanding</p>

        ${renderSubLesson('1.1', 'Shape Notes and Solfege Syllables', getSubLesson1_1())}
        ${renderSubLesson('1.2', 'Understanding the Staff Structure', getSubLesson1_2())}
        ${renderSubLesson('1.3', 'Movable Do System', getSubLesson1_3())}

        <div class="warmup-connection">
          <strong>What's Next: Daily Warmup</strong>
          Once you know the shapes, head to the Warmup tab to start singing them. Daily warmup is the single most important habit for ear training — it's the foundation that every other exercise builds on. Lesson 2 will guide you through it.
        </div>
      </div>
    </section>
  `;
}

function renderLesson2() {
  return `
    <section class="lesson" id="lesson-2" data-lesson="2">
      <div class="lesson-header" data-lesson-toggle="2">
        <h2>Lesson 2: Warm Up &amp; Singing Foundations</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="2">
        <p class="lesson-goal"><strong>Goal:</strong> Build singing confidence with scales, pitch matching, and finding your range</p>

        ${renderSubLesson('2.1', 'Finding Your Comfortable Do', getSubLesson2_1())}
        ${renderSubLesson('2.2', 'Visual and Audio Pitch Matching', getSubLesson2_2())}
        ${renderSubLesson('2.3', 'The Warm Up Patterns — Your Daily Practice', getSubLesson2_3())}
      </div>
    </section>
  `;
}

function renderLesson3() {
  return `
    <section class="lesson" id="lesson-3" data-lesson="3">
      <div class="lesson-header" data-lesson-toggle="3">
        <h2>Lesson 3: Intervals</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="3">
        <p class="lesson-goal"><strong>Goal:</strong> Recognize intervals by ear, from small steps to large leaps</p>

        <div class="warmup-connection">
          <strong>Warmup Connection: Intervals from Do</strong>
          Before starting interval exercises, warm up with the <strong>Intervals</strong> pattern (both directions) in the Warm Up room.
          You've been <em>producing</em> these intervals in the warm up — now you'll learn to <em>recognize</em> them when played back.
          The Do-Mi you sang becomes the Major 3rd you identify. If you can sing it, you can hear it.
        </div>

        ${renderSubLesson('3.1', 'Whole Steps, Half Steps, and Basic Intervals', getSubLesson3_1())}
        ${renderSubLesson('3.2', 'Interval Recognition: 2nds through 5ths', getSubLesson3_2())}
        ${renderSubLesson('3.3', 'Larger Intervals: 6ths, 7ths, Octaves', getSubLesson3_3())}
        ${renderSubLesson('3.4', 'Key Signatures and Accidentals', getSubLesson3_4())}
      </div>
    </section>
  `;
}

function renderLesson4() {
  return `
    <section class="lesson" id="lesson-4" data-lesson="4">
      <div class="lesson-header" data-lesson-toggle="4">
        <h2>Lesson 4: Pitch Distinction</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="4">
        <p class="lesson-goal"><strong>Goal:</strong> Hear and identify multiple simultaneous tones</p>

        <div class="warmup-connection">
          <strong>Warmup Connection: Arpeggios &amp; Intervals from Do</strong>
          The <strong>Arpeggios</strong> stanza is your secret weapon here. When you sing Do-Mi-Sol, you're hearing those three notes sequentially.
          In clusters, those same notes play <em>simultaneously</em>. If you can sing the arpeggio, you can pick apart the chord.
          Also revisit <strong>Intervals from Do</strong> — recognizing the interval between two cluster tones is how you identify the second and third notes.
        </div>

        ${renderSubLesson('4.1', 'Hearing Multiple Simultaneous Tones', getSubLesson4_1())}
        ${renderSubLesson('4.2', 'Strategies for Picking Apart Clusters', getSubLesson4_2())}
        ${renderSubLesson('4.3', 'From Clusters to Chords', getSubLesson4_3())}
      </div>
    </section>
  `;
}

function renderSubLesson(number, title, content) {
  return `
    <div class="sub-lesson" id="sub-lesson-${number}" data-sub-lesson="${number}">
      <div class="sub-lesson-header" data-sub-lesson-toggle="${number}">
        <h3>Sub-lesson ${number}: ${title}</h3>
        <span class="sub-lesson-toggle-icon">▶</span>
      </div>
      <div class="sub-lesson-content" data-sub-lesson-content="${number}">
        ${content}
      </div>
    </div>
  `;
}

function getSubLesson1_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Memorize all 7 shape note symbols (Do, Re, Mi, Fa, So, La, Ti)</li>
        <li>Understand the relationship between shapes and solfege syllables</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Open Flashcards:</strong>
          <ul>
            <li>Go to the <strong>Learn</strong> room (bottom nav on mobile, left rail on desktop)</li>
            <li>In the Learn sub-nav, choose <strong>Flashcards</strong></li>
            <li>The flashcard and its transport controls appear</li>
          </ul>
        </li>
        <li><strong>Set the Card Direction:</strong>
          <ul>
            <li>Open the <strong>"Card direction"</strong> options fold</li>
            <li>Choose <strong>"Shape → Solfege"</strong> (this is the default)</li>
          </ul>
        </li>
        <li><strong>Practice with Flashcards:</strong>
          <ul>
            <li>Press <strong>› Next</strong> in the transport (or the <strong>→</strong> arrow key)</li>
            <li>A shape note will appear in the large flashcard</li>
            <li>Look at the shape and try to identify which solfege syllable it represents</li>
            <li>Press <strong>Flip</strong> (or the <strong>Spacebar</strong>) to reveal the answer</li>
            <li>The shape flips to show the solfege syllable text (e.g., "Do", "Re", "Mi")</li>
            <li>If correct, press <strong>› Next</strong> to continue; if wrong, study the shape-syllable relationship</li>
            <li>Use <strong>‹ Prev</strong> (or the <strong>←</strong> arrow key) to step back to an earlier card</li>
            <li>Repeat until you can identify shapes quickly without hesitation</li>
          </ul>
        </li>
        <li><strong>Track Your Progress:</strong>
          <ul>
            <li>Keep a mental count or write down your score</li>
            <li>Aim for 20 consecutive correct answers</li>
            <li>Time yourself - goal is under 2 minutes for 20 cards</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>The flashcard shows a large shape note symbol</li>
        <li>Pressing "Flip" turns the card over to show the solfege text</li>
        <li>The card-count readout shows your position in the deck</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If the card doesn't respond to arrow keys, click the card once so it has focus, then try again</li>
        <li>If you're struggling, slow down and study each shape-syllable pair</li>
        <li>Remember: Do (Triangle), Re (Half Circle), Mi (Diamond), Fa (Flag), So (Oval), La (Rectange), Ti (Ice cream)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 20/20 correct on flashcards (no accidentals) in under 2 minutes</p>
      <p><strong>Progression:</strong> Move to 1.2 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="flashcards">Try it: Go to Flashcards &rarr;</button></p>
    </div>
  `;
}

function getSubLesson1_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand the structure of a musical staff (5 lines, 4 spaces)</li>
        <li>Learn about treble clef and bass clef</li>
        <li>Understand ledger lines for notes outside the staff</li>
        <li>Know where notes can appear (on lines or in spaces)</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Observe the Staff Structure:</strong>
          <ul>
            <li>Look at the large canvas that displays the music - this is the <strong>staff</strong></li>
            <li>Count the horizontal lines: there are <strong>5 lines</strong></li>
            <li>Count the spaces between lines: there are <strong>4 spaces</strong></li>
            <li>Notes can be placed <strong>on a line</strong> (the line goes through the middle of the note)</li>
            <li>Notes can be placed <strong>in a space</strong> (the note sits between two lines)</li>
          </ul>
        </li>
        <li><strong>Understand the Clefs:</strong>
          <ul>
            <li>At the left side of the staff, you'll see a symbol called a <strong>clef</strong></li>
            <li><strong>Treble clef</strong> (𝄞) - used for higher-pitched instruments and voices (Soprano, Alto)</li>
            <li><strong>Bass clef</strong> (𝄢) - used for lower-pitched instruments and voices (Tenor, Bass)</li>
            <li>The clef tells you which notes correspond to which lines and spaces</li>
          </ul>
        </li>
        <li><strong>Go to the Warm Up Room to See Notes:</strong>
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Major scale"</strong> pattern pill on</li>
            <li>Press the <strong>▶ play button</strong> to see shape notes appear on the staff</li>
            <li>Notice how notes are placed on different lines and spaces</li>
          </ul>
        </li>
        <li><strong>Observe Ledger Lines:</strong>
          <ul>
            <li>When notes go beyond the 5 lines, short additional lines appear</li>
            <li>These are called <strong>ledger lines</strong></li>
            <li>Ledger lines extend the staff upward or downward for very high or very low notes</li>
            <li>You may see ledger lines above the treble staff or below the bass staff</li>
          </ul>
        </li>
        <li><strong>Use Zoom Control</strong> (if needed):
          <ul>
            <li>Open the <strong>Settings sheet</strong> (the gear ⚙ icon) and find the <strong>"Zoom"</strong> slider</li>
            <li>Adjust it to make the staff larger (move slider right) or smaller (move slider left)</li>
            <li>This helps see staff details more clearly</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li><strong>5 lines</strong> make up the staff</li>
        <li><strong>4 spaces</strong> exist between the lines</li>
        <li>Notes can be <strong>on lines</strong> or <strong>in spaces</strong></li>
        <li><strong>Ledger lines</strong> extend the staff for very high or very low notes</li>
        <li>The <strong>clef symbol</strong> at the left indicates treble or bass</li>
        <li>The same shape note (e.g., Do) represents the same solfege syllable wherever it appears</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If staff is too small to see details, use the Zoom slider in the Settings sheet (gear ⚙)</li>
        <li>If you can't see the staff, make sure you're in a room that displays music (Warm Up, Sing in Parts, etc.)</li>
        <li>Drag the staff canvas to pan if notes are off-screen</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Be able to identify: the 5 lines and 4 spaces of the staff, where notes appear (on lines vs. in spaces), what ledger lines are, and the difference between treble and bass clef</p>
      <p><strong>Progression:</strong> Move to 1.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson1_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand that Do can be any starting pitch</li>
        <li>Learn to set Do in the app</li>
        <li>Learn to select different instrument voices (Sine Wave, Piano, Choir)</li>
        <li>Recognize that intervals stay the same regardless of key</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Locate the Do Control:</strong>
          <ul>
            <li>Open the <strong>Settings sheet</strong> by tapping the gear ⚙ icon in the header</li>
            <li>Find the control labeled <strong>"Starting note (Do)"</strong></li>
            <li>There's a dropdown menu and a <strong>"Play Do"</strong> button</li>
            <li>Note: your Do is already set automatically from the voice type (Soprano/Alto/Tenor/Bass) you picked at onboarding — this control lets you change it</li>
          </ul>
        </li>
        <li><strong>Change the Do Note:</strong>
          <ul>
            <li>Click the <strong>"Starting note (Do)"</strong> dropdown menu</li>
            <li>You'll see a list of notes (C4, C#4, D4, D#4, E4, F4, F#4, G4, G#4, A4, A#4, B4)</li>
            <li>Select a different note (e.g., if it's C4, change it to <strong>4G</strong>)</li>
            <li>Click the <strong>"Play Do"</strong> button to hear the new Do pitch</li>
          </ul>
        </li>
        <li><strong>Select Your Voice (Instrument):</strong>
          <ul>
            <li>In the same Settings sheet, find the <strong>"Voice"</strong> dropdown menu</li>
            <li>This controls what instrument sound is used for playback</li>
            <li>You have 4 options:
              <ul>
                <li><strong>Sine Wave</strong> - A pure, simple tone with no harmonics. Best for learning pitch relationships clearly.</li>
                <li><strong>Piano</strong> - A sampled acoustic piano. More realistic sound, good for general practice.</li>
                <li><strong>Choir (Aahs)</strong> - A sampled choir singing "Aah". Useful for vocal practice and hearing how parts blend.</li>
                <li><strong>Choir (Oohs)</strong> - A sampled choir singing "Ooh". Also useful for vocal practice.</li>
              </ul>
            </li>
            <li>Try switching between them:
              <ul>
                <li>Set Voice to <strong>"Sine Wave"</strong>, click <strong>"Play Do"</strong> - hear the pure tone</li>
                <li>Set Voice to <strong>"Piano"</strong>, click <strong>"Play Do"</strong> - hear the piano sound (may take a moment to load)</li>
                <li>Set Voice to <strong>"Choir (Aahs)"</strong>, click <strong>"Play Do"</strong> - hear the choir sound</li>
              </ul>
            </li>
            <li><strong>When to use each:</strong>
              <ul>
                <li>Use <strong>Sine Wave</strong> when learning intervals and pitch relationships - it's the clearest</li>
                <li>Use <strong>Piano</strong> for general practice and when you want a more musical sound</li>
                <li>Use <strong>Choir</strong> options when practicing SATB parts or when you want to hear how vocal parts sound together</li>
              </ul>
            </li>
            <li>Note: Piano and Choir sounds may take a moment to load the first time you select them</li>
          </ul>
        </li>
        <li><strong>Use the Warm Up Room to Hear Scales:</strong>
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Major scale"</strong> pattern pill on (leave "Intervals" and "Arpeggios" off for now)</li>
            <li>Press the <strong>▶ play button</strong></li>
            <li>Listen to the scale - it starts on whatever Do you set</li>
            <li>Watch the staff - you'll see the shape notes moving as the scale plays</li>
            <li>The red play line moves across the staff showing the current note</li>
          </ul>
        </li>
        <li><strong>Practice with Multiple Keys:</strong>
          <ul>
            <li>Set Do to <strong>C</strong>, play warmup, observe shapes</li>
            <li>Set Do to <strong>G</strong>, play warmup, observe shapes (same shapes, different pitches)</li>
            <li>Set Do to <strong>F</strong>, play warmup, observe shapes (same shapes again)</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>When you change Do, the dropdown updates</li>
        <li>"Play Do" button plays the current Do pitch</li>
        <li>Shapes in flashcards and warmup stay consistent</li>
        <li>The staff shows the same shapes regardless of key</li>
        <li>Voice selection affects the sound quality but not the pitch or shapes</li>
        <li>Sine Wave is clearest for learning, Piano is more musical, Choir is best for vocal practice</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If "Play Do" doesn't make sound, check your browser's audio permissions</li>
        <li>If shapes seem wrong, make sure you're looking at the shape, not the letter name</li>
        <li>If the warm up doesn't play, make sure at least one pattern pill is toggled on</li>
        <li>If Piano or Choir sounds don't play immediately, wait a moment - they need to load samples first</li>
        <li>If you want the clearest pitch reference, use Sine Wave</li>
        <li>If you want to practice with a more realistic sound, use Piano or Choir</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully identify shapes correctly when Do is changed to 3 different keys (test with C, G, and F)</p>
      <p><strong>Progression:</strong> Proceed to Lesson 2 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson3_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand whole step = 2 semitones (Do→Re, Re→Mi, Fa→So, So→La, La→Ti)</li>
        <li>Understand half step = 1 semitone (Mi→Fa, Ti→Do)</li>
        <li>Feel the difference between whole and half steps</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Practice with the Warm Up Room - Scales:</strong>
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Major scale"</strong> pattern pill on (leave "Intervals" and "Arpeggios" off); both directions are on by default</li>
            <li>Open the <strong>"Tempo, direction &amp; clef"</strong> options fold and set the tempo to <strong>60 BPM</strong> (or slower if needed)</li>
            <li>Press the <strong>▶ play button</strong></li>
            <li><strong>Listen carefully</strong> as the scale plays:
              <ul>
                <li>Notice the "feel" between each note</li>
                <li>Some steps feel bigger (whole steps)</li>
                <li>Some steps feel smaller (half steps: Mi→Fa and Ti→Do)</li>
              </ul>
            </li>
            <li>Watch the staff - the red play line shows which note is playing</li>
            <li>The shape notes are visible, so you can see Do→Re→Mi→Fa→So→La→Ti→Do</li>
            <li><strong>Repeat this 5-10 times</strong> to internalize the feel</li>
          </ul>
        </li>
        <li><strong>Open the Intervals Drill:</strong>
          <ul>
            <li>Open the <strong>Ear</strong> room and choose the <strong>Intervals</strong> drill from its sub-nav</li>
            <li>Open the <strong>"Difficulty &amp; interval range"</strong> options fold</li>
            <li>Click the <strong>"Easy"</strong> difficulty pill (it should highlight/activate)</li>
            <li>Find the <strong>"Direction"</strong> dropdown - set it to <strong>"Up"</strong></li>
            <li>Find <strong>"Min (semitones)"</strong> - set it to <strong>1</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set it to <strong>2</strong></li>
            <li>Make sure the <strong>"Scale notes only (diatonic)"</strong> checkbox is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Press the <strong>▶ play button</strong></li>
            <li>You'll hear two notes played in sequence:
              <ul>
                <li>First note (A) plays for a moment</li>
                <li>Second note (B) plays after a short pause</li>
              </ul>
            </li>
            <li><strong>Listen carefully</strong> to the interval between them</li>
            <li>Try to identify: Is it a half step (1 semitone) or whole step (2 semitones)?</li>
            <li>When you've decided, <strong>tap the answer button</strong> for what you heard (e.g., <strong>2nd</strong>)</li>
            <li>The drill instantly shows whether you were right or wrong and reveals both notes on the staff with their solfege labels</li>
            <li>The result readout names the interval (e.g., a ♭2nd for a half step, a 2nd for a whole step)</li>
          </ul>
        </li>
        <li><strong>Repeat and Track Progress:</strong>
          <ul>
            <li>Press the <strong>▶ play button</strong> again for a new interval</li>
            <li>Continue practicing until you can consistently identify half steps vs. whole steps</li>
            <li>Keep track: aim for 10 correct in a row</li>
          </ul>
        </li>
        <li><strong>Use Visual Feedback:</strong>
          <ul>
            <li>After you tap your answer, look at the staff</li>
            <li>The two notes are shown with their shape note symbols</li>
            <li>The interval is labeled (e.g., "Do → Re = a 2nd")</li>
            <li>Study the visual relationship between the notes</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Half steps (Mi→Fa, Ti→Do) feel "closer" or "tighter"</li>
        <li>Whole steps (Do→Re, Re→Mi, etc.) feel "more open"</li>
        <li>In the warm up, you can see and hear the pattern: W-W-H-W-W-W-H (whole-whole-half-whole-whole-whole-half)</li>
        <li>The Intervals drill shows the interval name and notes as soon as you tap your answer</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If the warm up is too fast, slow the tempo in the "Tempo, direction & clef" options fold</li>
        <li>If you can't tell the difference, play the warm up scale more times</li>
        <li>If nothing plays, press the ▶ play button first, then listen before tapping an answer</li>
        <li>If you're struggling, focus on just Mi→Fa and Ti→Do (the half steps) first</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify 10/10 intervals of 1-2 semitones on Easy mode</p>
      <p><strong>Progression:</strong> Move to 3.2 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson3_4() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand how key signatures affect note placement on the staff</li>
        <li>Learn what accidentals (sharps, flats, naturals) mean</li>
        <li>Understand why notes may appear with accidentals even when Do is set</li>
        <li>Understand that accidentals are suppressed if they match the key signature</li>
        <li>Learn to enable and toggle the unified "Show Accidentals & Key" setting in the app</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Understanding Key-Aware Placement:</strong>
          <ul>
            <li>When you set Do to a specific note (e.g., G#), the app treats that as the key</li>
            <li>For example, if Do = G#, then we're in G# major</li>
            <li>In G# major, certain notes need accidentals to be spelled correctly</li>
            <li>For instance, F natural in G# major is spelled as E# (not F♮) because of key signature rules</li>
            <li>This is why you might see accidentals even when playing scale notes</li>
          </ul>
        </li>
        <li><strong>Enable and Practice with Accidentals and Key Signatures on the Staff:</strong>
          <ul>
            <li>Open the <strong>Settings sheet</strong> (gear ⚙ icon) and set <strong>"Starting note (Do)"</strong> to <strong>G</strong> (or another key)</li>
            <li>Go to the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Back in the <strong>Settings sheet</strong> (gear ⚙), find the <strong>"Show Accidentals & Key"</strong> checkbox</li>
            <li><strong>Important:</strong> This setting is disabled by default - you must enable it to see key signatures and accidentals</li>
            <li><strong>Check</strong> the "Show Accidentals & Key" checkbox to enable it</li>
            <li>Notice that a <strong>key signature</strong> appears at the start of the staff (e.g., one sharp ♯ for G major)</li>
            <li>Toggle the <strong>"Major scale"</strong> pattern pill on and press the <strong>▶ play button</strong></li>
            <li>Watch the staff as the scale plays - you'll see accidentals (♯, ♭, or ♮) appearing before some notes</li>
            <li>These accidentals show how the note is spelled in that key</li>
            <li><strong>Key insight:</strong> Notes that match the key signature (e.g., F# in G major) show <strong>no accidental</strong> because the sharp is already in the key signature</li>
            <li>Notes that cancel the key signature (e.g., F♮ in G major) show a <strong>natural sign</strong> (♮)</li>
            <li><strong>Practice toggling the setting:</strong>
              <ul>
                <li>Try <strong>unchecking</strong> "Show Accidentals & Key" in the Settings sheet</li>
                <li>Notice how both the key signature and accidentals disappear from the staff</li>
                <li>Try <strong>checking</strong> it again - both will reappear</li>
                <li>This unified setting controls both key signatures and accidentals together</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Compare Different Keys and Key Signatures:</strong>
          <ul>
            <li>Make sure <strong>"Show Accidentals & Key"</strong> is enabled</li>
            <li>In the Settings sheet (gear ⚙), set the <strong>"Starting note (Do)"</strong> to <strong>C</strong> (no sharps/flats)</li>
            <li>Notice the key signature shows <strong>no sharps or flats</strong> at the start of the staff</li>
            <li>Play the warm up scale - notice there are no accidentals (C major has no sharps/flats in the key signature)</li>
            <li>Set Do to <strong>G</strong> (one sharp: F#)</li>
            <li>Notice the key signature shows <strong>one sharp (F#)</strong> at the start of the staff</li>
            <li>Play the warm up scale - notice that F# notes show <strong>no accidental</strong> (the sharp is in the key signature)</li>
            <li>If any F natural notes appear, they will show a <strong>natural sign (♮)</strong> to cancel the key signature</li>
            <li>Set Do to <strong>F</strong> (one flat: Bb)</li>
            <li>Notice the key signature shows <strong>one flat (Bb)</strong> at the start of the staff</li>
            <li>Play the warm up scale - notice that Bb notes show <strong>no accidental</strong> (the flat is in the key signature)</li>
            <li>This demonstrates how different keys require different key signatures, and how accidentals are suppressed when they match the key signature</li>
          </ul>
        </li>
        <li><strong>Understanding Key Signature Determination:</strong>
          <ul>
            <li><strong>For all rooms except Sing in Parts:</strong> The key signature is determined by your <strong>"Starting note (Do)" setting</strong> (movable Do)</li>
            <li>For example, if Do = G, the key signature is G major (1 sharp: F#)</li>
            <li>If Do = F, the key signature is F major (1 flat: Bb)</li>
            <li><strong>For the Sing in Parts screen:</strong> The key signature comes from the MIDI file (if available)</li>
            <li>This allows you to practice in different keys by simply changing your Do setting</li>
          </ul>
        </li>
        <li><strong>Understanding the Staff Placement:</strong>
          <ul>
            <li>Notes are placed on the staff based on their <strong>letter name</strong> (A, B, C, D, E, F, G)</li>
            <li>Each letter name has its own line or space on the staff</li>
            <li>Accidentals don't change the vertical position - they appear to the left of the note</li>
            <li>For example, F♮ and E# are the same pitch, but:
              <ul>
                <li>F♮ appears on the F line/space</li>
                <li>E# appears on the E line/space (with a sharp symbol)</li>
              </ul>
            </li>
            <li>The app uses key-aware spelling, so it chooses the correct letter name based on the key</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Key signatures appear at the start of the staff (after the clefs) when "Show Accidentals & Key" is enabled</li>
        <li>Accidentals appear to the left of note heads (♯ for sharp, ♭ for flat, ♮ for natural)</li>
        <li>Different keys show different key signatures (sharps or flats)</li>
        <li><strong>Important:</strong> Notes that match the key signature show <strong>no accidental</strong> (e.g., F# in G major shows no accidental because F# is in the key signature)</li>
        <li>Notes that cancel the key signature show a <strong>natural sign (♮)</strong> (e.g., F♮ in G major shows ♮ to cancel the F# in the key signature)</li>
        <li>When "Show Accidentals & Key" is unchecked, notes still appear in correct positions, just without key signatures or accidentals</li>
        <li>In sharp keys (G, D, A, E, B, F#, C#), the key signature shows sharps, and F# notes show no accidental</li>
        <li>In flat keys (F, Bb, Eb, Ab, Db, Gb, Cb), the key signature shows flats, and Bb notes show no accidental</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you don't see key signatures or accidentals, make sure "Show Accidentals & Key" is enabled (it's disabled by default)</li>
        <li>If you see accidentals that seem wrong, remember: the app uses key-aware spelling, which follows music theory rules</li>
        <li>If accidentals are distracting, uncheck "Show Accidentals & Key" - the notes will still be in correct positions</li>
        <li>If you can't find the "Show Accidentals & Key" checkbox, open the Settings sheet with the gear ⚙ icon</li>
        <li>If notes look like they're in wrong positions, that's likely due to key-aware placement - this is correct behavior</li>
        <li>Remember: accidentals don't change the pitch, they just show how the note is spelled in the current key</li>
        <li>Remember: notes that match the key signature show no accidental - this is correct behavior (the accidental is already in the key signature)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Understand why key signatures and accidentals appear in different keys, understand that accidentals are suppressed when they match the key signature, and be able to enable and toggle the "Show Accidentals & Key" setting</p>
      <p><strong>Progression:</strong> Proceed to Lesson 4 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 2 sub-lessons (Warmup & Singing Foundations)
function getSubLesson2_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Find a comfortable Do pitch for your vocal range</li>
        <li>Set Do in the app to match your comfortable range</li>
        <li>Understand why choosing the right Do matters for singing practice</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Find Your Comfortable Singing Range:</strong>
          <ul>
            <li>Without using the app yet, try humming or singing a comfortable note</li>
            <li>This should be a note you can sing easily, not too high or too low</li>
            <li>Try singing a few different notes and find one that feels natural and comfortable</li>
            <li>This will be your starting point for finding Do</li>
          </ul>
        </li>
        <li><strong>Understanding Octave Numbers in the Do Dropdown:</strong>
          <ul>
            <li>Open the <strong>Settings sheet</strong> (gear ⚙ icon) and find the <strong>"Starting note (Do)"</strong> dropdown menu</li>
            <li>You'll see notes like <strong>C3</strong>, <strong>C4</strong>, <strong>D4</strong>, <strong>E4</strong>, etc.</li>
            <li><strong>The number after the letter is the octave number</strong> - it tells you which octave the note is in</li>
            <li><strong>How octave numbers work:</strong>
              <ul>
                <li><strong>C4</strong> = Middle C (the C in the middle of a piano keyboard)</li>
                <li><strong>Lower numbers = lower pitches:</strong> C3 is one octave below C4, C2 is two octaves below C4</li>
                <li><strong>Higher numbers = higher pitches:</strong> C5 is one octave above C4, C6 is two octaves above C4</li>
                <li>Each octave spans from C to B (C, D, E, F, G, A, B, then the next C starts the next octave)</li>
              </ul>
            </li>
            <li><strong>Examples:</strong>
              <ul>
                <li><strong>D3</strong> = D in the 3rd octave (lower, below middle C)</li>
                <li><strong>D4</strong> = D in the 4th octave (around middle C range)</li>
                <li><strong>D5</strong> = D in the 5th octave (higher, above middle C)</li>
                <li>Same letter name (D), but different octaves = different pitches</li>
              </ul>
            </li>
            <li><strong>Why this matters:</strong> The same letter (like D) appears in multiple octaves - D1, D2, D3, D4, D5, etc. - each one is a different pitch. You need to choose both the letter AND the octave number to find your comfortable Do.</li>
          </ul>
        </li>
        <li><strong>Use the "Play Do" Button to Test Different Do Settings:</strong>
          <ul>
            <li>In the <strong>Settings sheet</strong> (gear ⚙), find the <strong>"Starting note (Do)"</strong> control</li>
            <li>There's a dropdown menu and a <strong>"Play Do"</strong> button</li>
            <li>Start with <strong>C4</strong> (middle C) - click the dropdown and select <strong>C4</strong> if it's not already selected</li>
            <li>Click the <strong>"Play Do"</strong> button</li>
            <li>You'll hear the Do pitch play briefly</li>
            <li><strong>Click "Play Do" multiple times</strong> to hear it repeatedly while you test</li>
          </ul>
        </li>
        <li><strong>Test if This Do is Comfortable:</strong>
          <ul>
            <li>Click <strong>"Play Do"</strong> to hear the pitch</li>
            <li><strong>Hum or sing "Do"</strong> to match the pitch you just heard</li>
            <li>Ask yourself:
              <ul>
                <li>Is this pitch comfortable to sing?</li>
                <li>Can I sing it without straining?</li>
                <li>Can I sing both higher and lower from this note?</li>
              </ul>
            </li>
            <li>If it feels too high or too low, you need to adjust</li>
          </ul>
        </li>
        <li><strong>Adjust Do to Find Your Comfortable Range:</strong>
          <ul>
            <li>If the current Do is too <strong>high</strong>:
              <ul>
                <li>You can lower it in two ways:
                  <ul>
                    <li><strong>Lower the octave number:</strong> If it's C4, try <strong>C3</strong> (one octave lower)</li>
                    <li><strong>Lower the letter name:</strong> If it's C4, try <strong>Bb3</strong> or <strong>A3</strong> (same octave, different note)</li>
                    <li><strong>Or both:</strong> Try <strong>Bb3</strong> or <strong>A3</strong> for even lower pitches</li>
                  </ul>
                </li>
                <li>Click <strong>"Play Do"</strong> to hear the new pitch</li>
                <li>Test again by humming/singing "Do" to match the pitch</li>
              </ul>
            </li>
            <li>If the current Do is too <strong>low</strong>:
              <ul>
                <li>You can raise it in two ways:
                  <ul>
                    <li><strong>Raise the octave number:</strong> If it's C4, try <strong>C5</strong> (one octave higher)</li>
                    <li><strong>Raise the letter name:</strong> If it's C4, try <strong>D4</strong> or <strong>E4</strong> (same octave, different note)</li>
                    <li><strong>Or both:</strong> Try <strong>D4</strong> or <strong>E4</strong> for comfortable mid-range pitches</li>
                  </ul>
                </li>
                <li>Click <strong>"Play Do"</strong> to hear the new pitch</li>
                <li>Test again by humming/singing "Do" to match the pitch</li>
              </ul>
            </li>
            <li>Continue adjusting and testing until you find a Do that feels comfortable</li>
            <li><strong>Tip:</strong> Click "Play Do" multiple times as you test - it helps you remember the pitch</li>
            <li><strong>Remember:</strong> Pay attention to both the letter (C, D, E, etc.) AND the octave number (3, 4, 5, etc.) when selecting your Do</li>
          </ul>
        </li>
        <li><strong>Test Your Full Range from This Do:</strong>
          <ul>
            <li>Once you've found a comfortable Do, test your range:</li>
            <li>Click <strong>"Play Do"</strong> to hear Do, then sing "Do"</li>
            <li>Now try singing the scale up from that Do:
              <ul>
                <li>Re (one step higher) - sing "Re"</li>
                <li>Mi (another step higher) - sing "Mi"</li>
                <li>Fa (another step higher) - sing "Fa"</li>
                <li>So (another step higher) - sing "So"</li>
                <li>La (another step higher) - sing "La"</li>
                <li>Ti (another step higher) - sing "Ti"</li>
                <li>Do (octave up) - sing "Do"</li>
              </ul>
            </li>
            <li>If you can comfortably sing from Do up to the octave Do, this is a good Do setting</li>
            <li>If you struggle with the higher notes (So, La, Ti, Do), try lowering Do by one or two semitones</li>
            <li>If the lower notes feel too low, try raising Do by one or two semitones</li>
          </ul>
        </li>
        <li><strong>Remember Your Do Setting:</strong>
          <ul>
            <li>Once you've found a comfortable Do, note which note it is (e.g., "My comfortable Do is D")</li>
            <li>This is the Do you'll use for all your singing practice</li>
            <li>You can always adjust it later if needed, but having a consistent Do helps with learning</li>
          </ul>
        </li>
        <li><strong>Test with a Scale:</strong>
          <ul>
            <li>Go to the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Major scale"</strong> pattern pill on and press the <strong>▶ play button</strong></li>
            <li>As the scale plays, try to <strong>sing the solfege syllables</strong> for each note:
              <ul>
                <li>Sing "Do" on the first note</li>
                <li>Sing "Re" on the second note</li>
                <li>Sing "Mi" on the third note</li>
                <li>Continue: "Fa", "So", "La", "Ti", "Do"</li>
              </ul>
            </li>
            <li><strong>Important:</strong> Sing the actual solfege syllable names ("Do", "Re", "Mi", etc.), not just hum or sing a vowel</li>
            <li>If you can comfortably sing the entire scale with solfege syllables, your Do is set correctly!</li>
            <li>If any notes are uncomfortable, open the Settings sheet (gear ⚙) and adjust Do, then test again</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>A comfortable Do should feel natural - not strained, not too breathy</li>
        <li>You should be able to sing at least one octave up from Do (Do→Re→Mi→Fa→So→La→Ti→Do)</li>
        <li>You should be able to sing a few notes below Do as well (for descending scales)</li>
        <li>Different people have different comfortable ranges - there's no "wrong" Do</li>
        <li>Women and higher voices often prefer Do around D, E, F, or G</li>
        <li>Men and lower voices often prefer Do around A, Bb, B, or C (middle C or lower)</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't find a comfortable Do, try starting with middle C (<strong>C4</strong>) and adjusting from there</li>
        <li>If all notes feel too high, try setting Do to a lower octave or lower note:
          <ul>
            <li>Try <strong>A3</strong> or <strong>Bb3</strong> (lower in the 3rd octave)</li>
            <li>Or try <strong>A4</strong> or <strong>Bb4</strong> but in a lower octave than your current setting</li>
            <li>Remember: Lower octave number = lower pitch (A3 is lower than A4)</li>
          </ul>
        </li>
        <li>If all notes feel too low, try setting Do to a higher octave or higher note:
          <ul>
            <li>Try <strong>E4</strong> or <strong>F4</strong> (in the 4th octave, around middle C range)</li>
            <li>Or try <strong>E5</strong> or <strong>F5</strong> (higher in the 5th octave)</li>
            <li>Remember: Higher octave number = higher pitch (E5 is higher than E4)</li>
          </ul>
        </li>
        <li><strong>Understanding the octave numbers:</strong>
          <ul>
            <li>The number after the letter (like the "4" in C4) indicates which octave the note is in</li>
            <li><strong>C4 = Middle C</strong> (the standard reference point on a piano)</li>
            <li>Numbers go from 0 (very low) to 8+ (very high), with 4 being around the middle of a piano keyboard</li>
            <li>Each octave contains 12 semitones (C, C#, D, D#, E, F, F#, G, G#, A, A#, B), then the next C starts the next octave</li>
            <li>For example: C4 → D4 → E4 → F4 → G4 → A4 → B4 → C5 (C5 starts the next octave)</li>
          </ul>
        </li>
        <li>Remember: You can always change Do later - this is just to find a good starting point</li>
        <li>If you're not sure, err on the side of a slightly lower Do (lower octave number) - it's easier to sing higher from a lower starting point than vice versa</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully find a Do setting that allows you to comfortably sing a full major scale (Do→Re→Mi→Fa→So→La→Ti→Do) using solfege syllables</p>
      <p><strong>Progression:</strong> Move to 2.2 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="warmup">Try it: Go to Warm Up &rarr;</button></p>
    </div>
  `;
}

function getSubLesson2_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand that higher on the staff = higher pitch</li>
        <li>Recognize visual distance between notes on the staff</li>
        <li>Use microphone feedback to see your pitch position relative to target notes</li>
        <li>Connect visual spacing to pitch intervals</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Set Up Microphone:</strong>
          <ul>
            <li>In the header, find the <strong>"Mic"</strong> button</li>
            <li>Tap <strong>"Mic"</strong> to start listening (you may need to allow browser microphone access); tap it again anytime to stop</li>
            <li>You should see your pitch appear on the staff as a line as you sing</li>
            <li>The header shows a live <strong>"Mic: — Hz | Δ cents"</strong> readout of your current pitch</li>
          </ul>
        </li>
        <li><strong>Observe the Staff in the Warm Up Room - Visual Distance:</strong>
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle only the <strong>"Major scale"</strong> pattern pill on</li>
            <li>Press the <strong>▶ play button</strong> (you don't need to sing yet - just watch)</li>
            <li><strong>Watch the staff carefully</strong> as the scale plays:
              <ul>
                <li>Notice where Do appears on the staff (its vertical position)</li>
                <li>Notice where Re appears - it's <strong>higher</strong> than Do</li>
                <li>Notice where Mi appears - it's <strong>higher</strong> than Re</li>
                <li>Continue watching: Fa, So, La, Ti, Do - each one is <strong>higher</strong> than the previous</li>
              </ul>
            </li>
            <li><strong>Key observation:</strong> As the pitch goes up, the note moves <strong>up on the staff</strong></li>
            <li><strong>Visual distance:</strong> Notice the spacing between notes:
              <ul>
                <li>Do to Re: small step up (adjacent lines/spaces)</li>
                <li>Re to Mi: small step up (adjacent lines/spaces)</li>
                <li>Mi to Fa: small step up (adjacent lines/spaces)</li>
                <li>So to La: small step up (adjacent lines/spaces)</li>
                <li>La to Ti: small step up (adjacent lines/spaces)</li>
                <li>Ti to Do: small step up (adjacent lines/spaces)</li>
              </ul>
            </li>
            <li>All these steps look similar in visual distance - they're all "steps" (2nds)</li>
            <li><strong>Play the warm up again</strong> and watch the red play line move up the staff as the scale ascends</li>
          </ul>
        </li>
        <li><strong>Practice Singing and Observing Visual Position:</strong>
          <ul>
            <li>With the warm up still playing, <strong>sing the solfege syllables</strong> as the scale plays:
              <ul>
                <li>When you hear Do, sing "Do" and watch where your voice line appears</li>
                <li>When you hear Re, sing "Re" and watch your voice line move <strong>up</strong></li>
                <li>Continue: "Mi", "Fa", "So", "La", "Ti", "Do" - watch your voice line move progressively <strong>higher</strong></li>
              </ul>
            </li>
            <li><strong>Important:</strong> Sing the actual solfege syllable names ("Do", "Re", "Mi", etc.), not just hum</li>
            <li><strong>Focus on the visual:</strong>
              <ul>
                <li>When you sing Do, your voice line should be at the same vertical position as the Do note</li>
                <li>When you sing Re, your voice line should move <strong>up</strong> to match Re's position</li>
                <li>Each syllable should move your voice line <strong>higher</strong> on the staff</li>
                <li>The distance your voice line moves = the pitch interval you're singing</li>
              </ul>
            </li>
            <li>If your voice line is <strong>above</strong> the target note, you're singing too high (sharp)</li>
            <li>If your voice line is <strong>below</strong> the target note, you're singing too low (flat)</li>
            <li>If your voice line <strong>aligns</strong> with the target note, you're singing the correct pitch!</li>
          </ul>
        </li>
        <li><strong>Practice with "Play Do" - Single Note Matching:</strong>
          <ul>
            <li>Open the <strong>Settings sheet</strong> (gear ⚙) and find the <strong>"Starting note (Do)"</strong> control</li>
            <li>Click the <strong>"Play Do"</strong> button to hear Do</li>
            <li><strong>Sing "Do"</strong> (the syllable) to match the pitch</li>
            <li><strong>Watch the staff</strong> - your voice line should appear at the same vertical position as Do</li>
            <li>If your line is above Do, you're singing too high - lower your pitch</li>
            <li>If your line is below Do, you're singing too low - raise your pitch</li>
            <li>Try to make your voice line align exactly with Do's position</li>
            <li><strong>Check the "Δ cents" display</strong> in the header - aim for <strong>±20 cents</strong> or less</li>
            <li>Repeat this several times: click "Play Do", sing "Do", watch your line align with Do</li>
          </ul>
        </li>
        <li><strong>Understand Visual Distance = Pitch Interval:</strong>
          <ul>
            <li>Go back to the <strong>Warm Up</strong> room</li>
            <li>Play the major scale again and <strong>watch the visual spacing</strong>:
              <ul>
                <li>Do to Re: small visual step (one line/space up) = small pitch step (2nd)</li>
                <li>Do to Mi: medium visual distance (two steps up) = medium pitch jump (3rd)</li>
                <li>Do to Fa: larger visual distance (three steps up) = larger pitch jump (4th)</li>
                <li>Do to So: even larger visual distance (four steps up) = even larger pitch jump (5th)</li>
              </ul>
            </li>
            <li><strong>Key concept:</strong> The visual distance between notes on the staff tells you the pitch interval</li>
            <li>Small visual distance = small pitch interval (2nd, 3rd)</li>
            <li>Large visual distance = large pitch interval (5th, 6th, 7th, octave)</li>
            <li>When you sing, watch how far your voice line moves - this tells you what interval you're singing</li>
          </ul>
        </li>
        <li><strong>Practice Matching Pitch with Visual Feedback:</strong>
          <ul>
            <li>Play the warmup scale again</li>
            <li>As each note plays, <strong>sing the solfege syllable</strong> and watch your voice line</li>
            <li>Try to make your voice line align with the target note's position</li>
            <li>Notice:
              <ul>
                <li>When you're correct, your line matches the target note's vertical position</li>
                <li>When you're sharp, your line appears <strong>above</strong> the target</li>
                <li>When you're flat, your line appears <strong>below</strong> the target</li>
                <li>The distance between your line and the target = how far off you are</li>
              </ul>
            </li>
            <li><strong>Use the visual distance</strong> to guide your pitch adjustment:
              <ul>
                <li>If your line is far above the target, lower your pitch significantly</li>
                <li>If your line is just slightly above, lower your pitch a little</li>
                <li>If your line is far below the target, raise your pitch significantly</li>
                <li>If your line is just slightly below, raise your pitch a little</li>
              </ul>
            </li>
            <li>Repeat until you can consistently align your voice line with the target notes</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li><strong>Higher on staff = higher pitch:</strong> Notes that appear higher on the staff represent higher pitches</li>
        <li><strong>Visual distance = pitch interval:</strong> The vertical distance between notes shows the pitch interval (2nd, 3rd, 4th, etc.)</li>
        <li><strong>Your voice line position:</strong> Your voice appears as a line on the staff - its vertical position shows your pitch</li>
        <li><strong>Alignment:</strong> When your voice line aligns with a target note, you're singing the correct pitch</li>
        <li><strong>Distance from target:</strong> The visual distance between your line and the target shows how far off you are</li>
        <li><strong>Progressive movement:</strong> As you sing up a scale, your voice line should move progressively higher on the staff</li>
        <li><strong>Cents display:</strong> ±20 or less = excellent alignment, ±50 = good, ±100 = needs work</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If mic doesn't work, check browser permissions (click the lock icon in address bar)</li>
        <li>If your voice line doesn't appear on staff, make sure the Mic button is on (tap it in the header)</li>
        <li>If your line is always way above/below, you might be singing an octave too high/low - try adjusting your Do setting in the Settings sheet</li>
        <li>If you can't see the visual distance clearly, use the Zoom slider in the Settings sheet (gear ⚙) to make the staff larger</li>
        <li>If the staff is cluttered, clear it by switching rooms or refreshing</li>
        <li>If you're confused about which direction is "up", remember: higher pitch = higher on the staff (like a ladder)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing a major scale (Do through Do) while observing that your voice line moves progressively higher on the staff, aligning with each target note within ±50 cents</p>
      <p><strong>Progression:</strong> Move to 2.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson2_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand what each warm up pattern trains</li>
        <li>Connect warm up exercises to the skills they build</li>
        <li>Establish a daily warm up practice routine</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>The Warm Up Patterns Explained:</h4>
      <p>The Warm Up room has three pattern pills — <strong>Major scale</strong>, <strong>Intervals</strong>, and <strong>Arpeggios</strong> — each of which
         plays ascending and descending. Together, they train <strong>every skill</strong> you'll need for the rest of this app.
         Do them daily — even just once through — and you'll build ear training ability faster than any other single exercise.</p>

      <h4>Major Scale (Up and Down)</h4>
      <p><strong>What it is:</strong> Do-Re-Mi-Fa-Sol-La-Ti-Do ascending, then the same descending.</p>
      <p><strong>What it trains:</strong> This is the foundation of everything. Every melody, every chord, every harmony
         is built from these 7 notes and the intervals between them. By singing the scale daily, you internalize
         the "feel" of each step — the wide whole steps (Do→Re, Re→Mi, Fa→Sol, Sol→La, La→Ti) and
         the narrow half steps (Mi→Fa, Ti→Do). This W-W-H-W-W-W-H pattern IS the major scale.</p>
      <p><strong>How to practice:</strong></p>
      <ol>
        <li>Toggle the <strong>"Major scale"</strong> pattern pill on in the Warm Up room (both directions are on by default)</li>
        <li>Press the <strong>▶ play button</strong> and sing along using solfege syllables</li>
        <li>Watch the staff — your mic line should track each note</li>
        <li>Focus on the half steps (Mi→Fa, Ti→Do) — they're the tricky ones</li>
      </ol>

      <h4>Intervals from Do (Up and Down)</h4>
      <p><strong>What it is:</strong> Do-Re, Do-Mi, Do-Fa, Do-Sol, Do-La, Do-Ti, Do-Do' — always returning to Do between each target note. The descending version starts from high Do.</p>
      <p><strong>What it trains:</strong> This is your <strong>interval recognition engine</strong>. By always returning to Do,
         you learn to <em>produce</em> each interval from a reference pitch. The Do-Mi you sing here IS the Major 3rd.
         The Do-Sol is the Perfect 5th. When the Intervals drill (in the Ear room) plays two notes and asks "what interval?",
         you'll recognize it because your voice already knows what it feels like to jump from Do to that note.</p>
      <p><strong>How to practice:</strong></p>
      <ol>
        <li>Toggle the <strong>"Intervals"</strong> pattern pill on (both directions are on by default)</li>
        <li>Sing each interval clearly: "Do... Re... Do... Mi... Do... Fa..." etc.</li>
        <li>Really <em>feel</em> the size of each jump — 2nd (small), 3rd (medium), 5th (large), octave (huge)</li>
        <li>The descending direction trains the same intervals going down — equally important</li>
      </ol>

      <h4>Arpeggios (Up and Down)</h4>
      <p><strong>What it is:</strong> Triads built on every scale degree — Do-Mi-Sol (I chord), Re-Fa-La (ii chord),
         Mi-Sol-Ti (iii chord), Fa-La-Do (IV chord), Sol-Ti-Re (V chord), La-Do-Mi (vi chord) — ascending, then descending.</p>
      <p><strong>What it trains:</strong> Each arpeggio IS a chord, played one note at a time. When you sing Do-Mi-Sol,
         you're singing the major triad. When you later hear those 3 notes played <em>simultaneously</em> in the
         Pitch Distinction or Chord Quality drills (Ear room), you'll recognize them because your voice already knows those notes individually.
         The arpeggios also prepare you for the Sing in Parts screen — each voice part moves through these chord tones.</p>
      <p><strong>How to practice:</strong></p>
      <ol>
        <li>Toggle the <strong>"Arpeggios"</strong> pattern pill on (both directions are on by default)</li>
        <li>Sing each triad clearly with solfege: "Do-Mi-Sol... Re-Fa-La... Mi-Sol-Ti..." etc.</li>
        <li>Notice which triads sound <strong>major</strong> (bright: I, IV, V) vs. <strong>minor</strong> (dark: ii, iii, vi)</li>
        <li>This awareness will directly help you in Chord Quality exercises later</li>
      </ol>

      <h4>Putting It All Together: Your Daily Routine</h4>
      <p>A complete warm up takes about 3-4 minutes at 60 BPM. Do it every time you open the app:</p>
      <ol>
        <li>Toggle all three pattern pills on — <strong>Major scale</strong>, <strong>Intervals</strong>, and <strong>Arpeggios</strong></li>
        <li>Press the <strong>▶ play button</strong> and sing along with solfege syllables</li>
        <li>Tap the <strong>Mic</strong> button to verify your pitch accuracy</li>
        <li>As you get comfortable, try singing ahead of the playback (anticipate the next note)</li>
      </ol>
      <p><strong>Key insight:</strong> If you can <em>produce</em> intervals and chords with your voice, you can <em>recognize</em>
         them by ear. The warm up is not just a warm up — it's the core training that makes everything else possible.</p>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Your pitch accuracy improving over days and weeks of daily practice</li>
        <li>Half steps (Mi→Fa, Ti→Do) becoming easier to nail</li>
        <li>Intervals from Do becoming automatic — you "just know" what Do→Sol sounds like</li>
        <li>Arpeggio quality differences becoming clearer (major vs. minor triads)</li>
        <li>The status readout showing which pattern is playing so you can follow along</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If everything is too fast, slow the tempo in the "Tempo, direction & clef" options fold (try 45-50 BPM)</li>
        <li>If you can't keep up with all three patterns, start with just the Major scale pill and add more as you improve</li>
        <li>If arpeggios are hard, practice the Major scale pattern until it's solid first</li>
        <li>If you're not sure you're singing the right pitch, tap the Mic button and watch the staff</li>
        <li>If your voice cracks on high notes, lower your Do setting in the Settings sheet (try 2 semitones lower)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Complete all three warm up patterns while singing along with solfege syllables, maintaining pitch within ±50 cents for most notes</p>
      <p><strong>Progression:</strong> Proceed to Lesson 3 when benchmark achieved. Continue doing daily warm ups — they support every exercise that follows.</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="warmup">Try it: Go to Warm Up &rarr;</button></p>
    </div>
  `;
}

function getSubLesson3_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Recognize intervals by ear (2nd, 3rd, 4th, 5th)</li>
        <li>Understand intervals in solfege terms (Do→Re = 2nd, Do→Mi = 3rd, etc.)</li>
        <li>Distinguish between ascending and descending intervals</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Review Intervals with the Warm Up Room:</strong>
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Intervals"</strong> pattern pill on (leave the others off)</li>
            <li>In the <strong>"Tempo, direction &amp; clef"</strong> fold, set the direction to ascending for now</li>
            <li>Press the <strong>▶ play button</strong></li>
            <li>Listen to each interval: Do→Re (2nd), Do→Mi (3rd), Do→Fa (4th), Do→So (5th), etc.</li>
            <li><strong>Repeat 3-5 times</strong> to familiarize yourself with each interval's "feel"</li>
          </ul>
        </li>
        <li><strong>Configure the Intervals Drill:</strong>
          <ul>
            <li>Open the <strong>Ear</strong> room and choose the <strong>Intervals</strong> drill</li>
            <li>Open the <strong>"Difficulty &amp; interval range"</strong> options fold</li>
            <li>Click the <strong>"Easy"</strong> difficulty pill (should highlight)</li>
            <li>Find <strong>"Direction"</strong> dropdown - set to <strong>"Up"</strong> (ascending only for now)</li>
            <li>Find <strong>"Min (semitones)"</strong> - set to <strong>2</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set to <strong>7</strong> (this covers 2nd through 5th)</li>
            <li>Make sure <strong>"Scale notes only (diatonic)"</strong> is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Press the <strong>▶ play button</strong></li>
            <li>Listen to the two notes (A then B)</li>
            <li><strong>Try to identify the interval</strong>:
              <ul>
                <li>Is it small (2nd or 3rd)?</li>
                <li>Is it medium (4th or 5th)?</li>
                <li>Try to name it: "That's a 3rd" or "That's a 5th"</li>
              </ul>
            </li>
            <li>When you've decided, <strong>tap the answer button</strong> for the interval you heard (e.g., <strong>3rd</strong>, <strong>4th</strong>)</li>
            <li>The drill instantly marks your answer right or wrong and reveals both notes on the staff with solfege labels</li>
            <li>The result readout names the interval (e.g., "3rd", "4th")</li>
            <li><strong>Were you correct?</strong> If yes, great! If no, study the interval</li>
          </ul>
        </li>
        <li><strong>Study the Visual Feedback:</strong>
          <ul>
            <li>After you tap your answer, look at the staff</li>
            <li>See the two shape notes</li>
            <li>Notice the distance between them (visual spacing)</li>
            <li>Read the solfege labels (e.g., "Do → Mi")</li>
            <li>Read the interval name (e.g., "Major 3rd")</li>
            <li><strong>Connect the sound to the visual and the name</strong></li>
          </ul>
        </li>
        <li><strong>Practice Systematically:</strong>
          <ul>
            <li>Play 10 intervals</li>
            <li>For each one:
              <ul>
                <li>Listen</li>
                <li>Identify (guess)</li>
                <li>Tap your answer</li>
                <li>Check if correct</li>
                <li>If wrong, listen again and study</li>
              </ul>
            </li>
            <li>Track your score: aim for 10/10 correct</li>
          </ul>
        </li>
        <li><strong>Use Solfege to Help:</strong>
          <ul>
            <li>When you hear an interval, try to identify the solfege syllables</li>
            <li>For example: "That sounds like Do to Mi" = Major 3rd</li>
            <li>Or: "That sounds like Do to So" = Perfect 5th</li>
            <li>The staff will confirm your solfege guess when you tap your answer</li>
          </ul>
        </li>
        <li><strong>Now Practice Descending Intervals:</strong>
          <ul>
            <li>Once you're comfortable with ascending intervals, it's time to learn <strong>descending</strong> intervals</li>
            <li><strong>What is a descending interval?</strong>
              <ul>
                <li><strong>Ascending</strong> = second note is <strong>higher</strong> than the first (going UP)</li>
                <li><strong>Descending</strong> = second note is <strong>lower</strong> than the first (going DOWN)</li>
              </ul>
            </li>
            <li>In the Intervals drill's <strong>"Difficulty &amp; interval range"</strong> fold, change the <strong>"Direction"</strong> dropdown to <strong>"Down"</strong></li>
            <li>Keep the same settings: Min 2, Max 7, diatonic checked</li>
            <li>Press the <strong>▶ play button</strong></li>
            <li>Now you'll hear the first note, then a <strong>lower</strong> second note</li>
          </ul>
        </li>
        <li><strong>Understand the Descending "Feel":</strong>
          <ul>
            <li>Descending intervals have a different character than ascending:
              <ul>
                <li><strong>Descending 2nds</strong> (Do→Ti, Re→Do): Feel like "stepping down" or "settling"</li>
                <li><strong>Descending 3rds</strong> (Do→La, Mi→Do): Feel like "falling gently"</li>
                <li><strong>Descending 4ths</strong> (Do→So below, Fa→Do): Feel like "dropping down"</li>
                <li><strong>Descending 5ths</strong> (Do→Fa below, So→Do): Feel like a "big drop"</li>
              </ul>
            </li>
            <li>Practice identifying the <strong>size</strong> of the interval (2nd, 3rd, 4th, 5th) even when it goes down</li>
            <li>The interval name stays the same - a 3rd is a 3rd whether ascending or descending</li>
          </ul>
        </li>
        <li><strong>Practice Descending Intervals:</strong>
          <ul>
            <li>Play 10 descending intervals</li>
            <li>For each one: Listen → Identify the interval size → Tap your answer → Check</li>
            <li>Aim for 10/10 correct on descending before moving on</li>
            <li>If struggling, use the <strong>"Intervals"</strong> warm up pattern set to descending to hear descending examples</li>
          </ul>
        </li>
        <li><strong>Mix Ascending and Descending:</strong>
          <ul>
            <li>Once comfortable with both, change <strong>"Direction"</strong> in the fold to <strong>"Either"</strong></li>
            <li>Now intervals can go up OR down - you won't know which until you hear it</li>
            <li>First identify: Is it ascending or descending?</li>
            <li>Then identify: What size interval is it?</li>
            <li>Practice until you can identify both direction and size correctly</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li><strong>Ascending intervals:</strong> Second note appears <strong>higher</strong> on the staff</li>
        <li><strong>Descending intervals:</strong> Second note appears <strong>lower</strong> on the staff</li>
        <li>2nds feel "close" (Do→Re ascending, Do→Ti descending)</li>
        <li>3rds feel "sweet" or "harmonious" (Do→Mi ascending, Do→La descending)</li>
        <li>4ths feel "open" (Do→Fa ascending, Do→So-below descending)</li>
        <li>5ths feel "stable" or "strong" (Do→So ascending, Do→Fa-below descending)</li>
        <li>The staff shows the exact interval as soon as you tap your answer</li>
        <li>The result readout shows the interval name (2nd, 3rd, etc.)</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If all intervals sound the same, play the "Intervals" warm up pattern more times</li>
        <li>If you're guessing randomly, slow down and really listen to each interval</li>
        <li>If you're confusing 2nds and 3rds, focus on those two first</li>
        <li>If you're confusing 4ths and 5ths, practice those specifically</li>
        <li>Use the warm up to hear "pure" examples before testing yourself</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on the Intervals drill with intervals 2-7 semitones in EACH direction:</p>
      <ul>
        <li>10/10 with Direction: Up (ascending)</li>
        <li>10/10 with Direction: Down (descending)</li>
        <li>10/10 with Direction: Either (mixed)</li>
      </ul>
      <p><strong>Progression:</strong> Move to 3.3 when all three benchmarks achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="intervals">Try it: Go to Intervals &rarr;</button></p>
    </div>
  `;
}

function getSubLesson3_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Recognize larger intervals (6th, 7th, octave)</li>
        <li>Identify intervals from any starting note (not just Do)</li>
        <li>Master the full range of diatonic intervals</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Configure the Intervals Drill for Larger Intervals:</strong>
          <ul>
            <li>Open the <strong>Ear</strong> room and choose the <strong>Intervals</strong> drill</li>
            <li>Open the <strong>"Difficulty &amp; interval range"</strong> options fold</li>
            <li>Click the <strong>"Medium"</strong> difficulty pill (upgrade from Easy)</li>
            <li>Find <strong>"Direction"</strong> dropdown - keep it on <strong>"Either"</strong> (you mastered this in 3.2)</li>
            <li>Find <strong>"Min (semitones)"</strong> - set to <strong>1</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set to <strong>12</strong> (this includes octaves)</li>
            <li>Make sure <strong>"Scale notes only (diatonic)"</strong> is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice with the Warm Up First</strong> (optional review):
          <ul>
            <li>Open the <strong>Warm Up</strong> room (Warm nav)</li>
            <li>Toggle the <strong>"Intervals"</strong> pattern pill on (both directions are on by default)</li>
            <li>Press the <strong>▶ play button</strong> to hear larger intervals (6th, 7th, octave)</li>
            <li>Listen for the "feel" of these larger intervals</li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Go back to the <strong>Intervals</strong> drill in the Ear room</li>
            <li>Press the <strong>▶ play button</strong></li>
            <li>Remember: intervals can go up or down (you practiced this in 2.2)</li>
            <li>Now focus on identifying the <strong>larger intervals</strong>: 6th, 7th, octave</li>
            <li><strong>Tap the answer button</strong> for what you heard to check</li>
            <li>Study the staff and result readout for feedback</li>
          </ul>
        </li>
        <li><strong>Focus on Larger Intervals:</strong>
          <ul>
            <li>As you practice, pay special attention to:
              <ul>
                <li><strong>6ths</strong> (Do→La, Re→Ti) - feel "wide" or "expansive"</li>
                <li><strong>7ths</strong> (Do→Ti, Re→Do) - feel "dissonant" or "unstable"</li>
                <li><strong>Octaves</strong> (Do→Do) - feel "same but different" (same note name, different pitch)</li>
              </ul>
            </li>
            <li>These are harder to identify, so give them extra practice</li>
          </ul>
        </li>
        <li><strong>Practice from Different Starting Notes:</strong>
          <ul>
            <li>Medium mode means the first note isn't always Do</li>
            <li>You might hear Re→Fa, Mi→So, etc.</li>
            <li>This is more challenging but more realistic</li>
            <li>Use solfege to help: "That's Mi to So, which is a 3rd"</li>
          </ul>
        </li>
        <li><strong>Track Your Progress:</strong>
          <ul>
            <li>Practice 10 intervals</li>
            <li>Aim for 10/10 correct</li>
            <li>If you're getting 7-8/10, you're close - keep practicing</li>
            <li>If you're getting 5/10 or less, go back to Easy mode and review</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>6ths feel "wide" - like a big jump (Do→La ascending, Do→Mi-below descending)</li>
        <li>7ths feel "unresolved" - want to go to the octave (Do→Ti wants to resolve to Do)</li>
        <li>Octaves feel "familiar" - same note, different register (Do→Do)</li>
        <li>You should already be comfortable with ascending vs. descending from Lesson 3.2</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you're confusing 6ths and 7ths, practice those two specifically</li>
        <li>If octaves are hard, practice Do→Do (octave) vs. Do→Ti (7th) to feel the difference</li>
        <li>If direction (ascending/descending) is still confusing, review Lesson 3.2</li>
        <li>If starting from different notes is hard, that's normal - keep practicing</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on the Intervals drill Medium difficulty (intervals 1-12 semitones, direction either)</p>
      <p><strong>Progression:</strong> Move to 3.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson4_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Hear and identify 2-3 simultaneous pitches</li>
        <li>Understand how multiple voices create harmony</li>
        <li>Develop ability to "pick out" individual tones from a chord</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Open the Pitch Distinction drill:</strong>
          <ul>
            <li>Open the <strong>Ear</strong> room (bottom nav on mobile, left rail on desktop)</li>
            <li>In the Ear sub-nav, choose <strong>Pitch Distinction</strong></li>
            <li>The prompt reads: "Two notes sound together — tap the interval you hear"</li>
          </ul>
        </li>
        <li><strong>Set up the options fold:</strong>
          <ul>
            <li>Open the <strong>"Difficulty &amp; play length"</strong> options fold</li>
            <li>Tap the <strong>Easy</strong> difficulty pill (start here)</li>
            <li>Turn <strong>ON</strong> the <strong>"Scale notes only (diatonic)"</strong> toggle</li>
            <li>Drag the <strong>Play length</strong> slider up to a longer setting (more time to listen) while you're learning</li>
          </ul>
        </li>
        <li><strong>Play and listen:</strong>
          <ul>
            <li>Press the round brass <strong>&#9654;</strong> play button</li>
            <li>It plays exactly <strong>two notes at the same time</strong> for the play length you set</li>
            <li><strong>Listen carefully</strong> — hum or sing each tone you hear</li>
            <li>Focus on the <strong>interval</strong> between them: does it sound like a 3rd, a 5th, an octave?</li>
          </ul>
        </li>
        <li><strong>Tap your answer:</strong>
          <ul>
            <li>Answer buttons for the possible intervals appear below the staff</li>
            <li>Tap the button for the interval you think you heard</li>
            <li>It reveals right or wrong instantly and shows the two notes on the staff with their solfege labels</li>
            <li>There is no separate Reveal button — tapping the answer is what reveals it</li>
          </ul>
        </li>
        <li><strong>Practice systematically:</strong>
          <ul>
            <li>Press <strong>&#9654;</strong> again for a new pair, listen, then tap your answer</li>
            <li>Repeat about 10 times</li>
            <li>Keep a mental score: aim for 10/10 correct</li>
          </ul>
        </li>
        <li><strong>Move to Medium difficulty:</strong>
          <ul>
            <li>Once you're consistent on Easy, tap the <strong>Medium</strong> difficulty pill</li>
            <li>Medium widens the range so the two notes may be further apart in pitch</li>
            <li>Aim for 10/10 correct on Medium</li>
          </ul>
        </li>
        <li><strong>Tighten the play length for a challenge:</strong>
          <ul>
            <li>If you want more time, drag the <strong>Play length</strong> slider up</li>
            <li>As you improve, drag it <strong>down</strong> so you get a shorter listen — you have to grab the interval faster</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Easy difficulty with "Scale notes only" on: both tones are diatonic (in the scale)</li>
        <li>Medium difficulty: wider range between the two tones</li>
        <li>After you tap, the staff shows both tones with their shape notes and solfege labels</li>
        <li>The tones are sorted from lowest to highest on the staff</li>
        <li>Try to "pick out" each tone individually, then name the interval between them</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear the two tones separately, drag the Play length slider up for more time</li>
        <li>If they blur into one sound, focus on the lowest tone first, then the higher one</li>
        <li>If you keep hearing only one note, listen again — there are always two tones sounding together</li>
        <li>If Easy is too hard, that's okay — keep practicing, your ear will improve</li>
        <li>Try humming along with the lower tone, then switch to the upper tone</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on Pitch Distinction at Medium difficulty</p>
      <p><strong>Progression:</strong> Move to 4.2 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="cluster">Try it: Go to Pitch Distinction &rarr;</button></p>
    </div>
  `;
}

function getSubLesson4_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Learn practical strategies for separating simultaneous tones</li>
        <li>Use your warmup training to identify cluster notes</li>
        <li>Progress through difficulty levels with confidence</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed Strategies:</h4>
      <ol>
        <li><strong>Strategy 1 — Hum the Lowest Note First:</strong>
          <ul>
            <li>When a cluster plays, focus on the <strong>lowest tone</strong> — it's usually the easiest to isolate</li>
            <li>Hum or sing it to lock it in</li>
            <li>Once you've identified the bottom note, mentally "subtract" it and listen for what's left</li>
            <li>This is exactly what bass singers do in SATB — they find the lowest note and hold it</li>
          </ul>
        </li>
        <li><strong>Strategy 2 — Use the Play length Slider:</strong>
          <ul>
            <li>In the <strong>"Difficulty &amp; play length"</strong> fold, drag the <strong>Play length</strong> slider up when starting out</li>
            <li>More time = more chances to focus on each tone</li>
            <li>On the first listen, find the lower note. Press <strong>&#9654;</strong> again and find the higher note.</li>
            <li>As you improve, drag the Play length slider down for a shorter listen and more challenge</li>
          </ul>
        </li>
        <li><strong>Strategy 3 — Use Your Arpeggio Training:</strong>
          <ul>
            <li>You've been singing arpeggios in warmup: Do-Mi-Sol, Re-Fa-La, etc.</li>
            <li>When you hear a cluster, ask: "Does this sound like one of my arpeggios?"</li>
            <li>If you hear Do and Sol together, that's the outer notes of the I chord arpeggio</li>
            <li>If you hear Re and La, that's the ii chord arpeggio pattern</li>
            <li>Your voice memory from warmup helps your ear decode what it hears</li>
          </ul>
        </li>
        <li><strong>Strategy 4 — Identify the Interval Between Notes:</strong>
          <ul>
            <li>The two tones sound together — identify the <strong>interval</strong> between them (this is exactly what the drill asks you to tap)</li>
            <li>Use your Intervals from Do training: "This sounds like a 3rd" or "This sounds like a 5th"</li>
            <li>Once you know the interval and one of the notes, you can figure out the other</li>
            <li>For example: "The lower note sounds like Do, and the interval is a 3rd, so the upper note is Mi"</li>
          </ul>
        </li>
        <li><strong>Progression Through Difficulties:</strong>
          <ul>
            <li><strong>Easy:</strong> Often includes Do + one other diatonic note. Start here — you just need to identify what's paired with Do</li>
            <li><strong>Medium:</strong> Wider range, may not include Do. Use interval recognition to identify both notes</li>
            <li><strong>Hard:</strong> Chromatic notes possible. Listen for the "color" of non-scale notes</li>
            <li><strong>Expert:</strong> Fully chromatic. Tap the <strong>Expert</strong> difficulty pill only once Hard feels reliable</li>
            <li>Rather than adding a third note, raise the difficulty pill and drag the Play length slider down to keep pushing yourself</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Your speed at identifying the lowest note improving with practice</li>
        <li>Arpeggio patterns becoming recognizable in clusters</li>
        <li>Interval recognition from Lesson 3 directly helping decode clusters</li>
        <li>Increased confidence when moving from 2-note to 3-note clusters</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If the two tones blur together, drag the Play length slider up and focus on just the lower tone first</li>
        <li>If you can hear one note but not the other, try singing Do-Mi-Sol to yourself and see if either tone matches</li>
        <li>If you're stuck on Easy, go back to the Warm Up room and sing Intervals from Do a few times, then try again</li>
        <li>If Hard difficulty is overwhelming, stay on Medium until you're consistently getting 8/10+</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 8/10 correct at Medium difficulty, and 6/10 at Hard difficulty with a shorter Play length</p>
      <p><strong>Progression:</strong> Move to 4.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson4_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand that clusters and chords are the same thing</li>
        <li>Recognize common triads when played simultaneously</li>
        <li>Bridge cluster detection skills into chord quality awareness</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>The Connection:</h4>
      <p>Here's the insight that ties everything together: <strong>a cluster of 3 simultaneous notes IS a chord</strong>.
         When you hear Do-Mi-Sol played at the same time, that's not just "3 notes" — it's a <strong>major triad</strong>.
         The cluster detection skill you've been building is actually the chord recognition skill.</p>

      <h4>Practice Recognizing Chord Shapes:</h4>
      <ol>
        <li><strong>Hear full triads in Chord Quality's Explore mode</strong>
          <ul>
            <li>In the <strong>Ear</strong> room, choose the <strong>Chord Quality</strong> drill and set its toggle to <strong>Explore</strong></li>
            <li>Build a triad from the root + quality buttons and hold it as a drone — do the three notes form a shape you know from warmup arpeggios?</li>
            <li>Do-Mi-Sol = I chord (major). Re-Fa-La = ii chord (minor). Fa-La-Do = IV chord (major).</li>
            <li>Start noticing: "That's a I chord!" or "That's a ii chord!"</li>
          </ul>
        </li>
        <li><strong>Cross-train with the Chord Quality drill:</strong>
          <ul>
            <li>Use <strong>Explore</strong> mode to build and hold the <strong>I chord</strong> (Do major) as a drone to sing against</li>
            <li>Then switch the toggle to <strong>Test me</strong>: press the <strong>&#9654;</strong> play button to hear a chord and tap its quality</li>
            <li>Ask yourself: "Does this match the I chord I just held?"</li>
            <li>Back in <strong>Pitch Distinction</strong>, notice how the two-note interval you tap is the skeleton of these triads</li>
            <li>This cross-training connects your two-note hearing with full chord identification</li>
          </ul>
        </li>
        <li><strong>Use arpeggios as a "decoder ring":</strong>
          <ul>
            <li>When you hear notes together, quickly sing the arpeggio that might match</li>
            <li>Hear a bright chord with Do at the bottom? Sing "Do-Mi-Sol" — does it match?</li>
            <li>Hear a darker one? Try "Re-Fa-La" or "La-Do-Mi" — minor triads</li>
            <li>Your warmup arpeggio training is literally the key to unlocking chord recognition</li>
          </ul>
        </li>
      </ol>

      <h4>What This Means for What's Next:</h4>
      <p>In <strong>Lesson 5 (Chord Quality)</strong>, you'll learn to formally identify chord types (major, minor, diminished, etc.)
         and understand chord progressions. But the ear training foundation? You've already built it here and in your daily warmup.
         The Chord Quality drill just gives you the vocabulary and formal framework for what your ear already knows.</p>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Clusters that "sound familiar" from your arpeggio practice</li>
        <li>Major triads (I, IV, V) sound bright — minor triads (ii, iii, vi) sound darker</li>
        <li>Your ability to name the chord (not just the individual notes) when hearing a cluster</li>
        <li>Growing confidence that cluster detection and chord recognition are the same skill</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can name individual notes but not the chord, review the arpeggio patterns: which scale degree triads are major vs. minor?</li>
        <li>If notes together don't sound like "chords" yet, spend more time in the Chord Quality drill's Explore mode holding drone chords, then come back</li>
        <li>If you're confused about major vs. minor, just listen to the "brightness" — major is bright, minor is dark</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify the two notes in Pitch Distinction AND, in Chord Quality's Test me mode, the chord type (major or minor) at least 6/10 times</p>
      <p><strong>Progression:</strong> Proceed to Lesson 5 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="cluster">Try it: Go to Pitch Distinction &rarr;</button></p>
    </div>
  `;
}

// Lesson 6 sub-lessons (SATB)
function getSubLesson6_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand Soprano (highest), Alto, Tenor, Bass (lowest) parts</li>
        <li>Recognize how shape notes appear in each part</li>
        <li>Understand that all parts sing the same solfege syllables (movable Do)</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Open Sing in Parts:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>You'll see the hymn picker, the engraved staff, a <strong>&#9654; play</strong> transport, and the <strong>"My part"</strong> control</li>
          </ul>
        </li>
        <li><strong>Pick a Hymn:</strong>
          <ul>
            <li>Tap <strong>"Browse hymns"</strong> to see available hymns</li>
            <li>Pick the first hymn (or any simple one)</li>
            <li>The staff will update to show all 4 parts</li>
          </ul>
        </li>
        <li><strong>Observe the Staff Display:</strong>
          <ul>
            <li>Look at the staff canvas above</li>
            <li>You should see 4 different parts displayed:
              <ul>
                <li><strong>Soprano (S)</strong> - highest notes, usually on treble clef</li>
                <li><strong>Alto (A)</strong> - second highest, also on treble clef</li>
                <li><strong>Tenor (T)</strong> - lower, usually on bass clef (or treble clef an octave down)</li>
                <li><strong>Bass (B)</strong> - lowest notes, on bass clef</li>
              </ul>
            </li>
            <li>Each part has its own shape notes</li>
            <li>Notice: All parts use the same solfege syllables (Do, Re, Mi, etc.) but at different pitches</li>
          </ul>
        </li>
        <li><strong>Use the Mixer to Isolate Parts:</strong>
          <ul>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold to find the 4-part mixer</li>
            <li>You'll see 4 volume sliders: <strong>Soprano, Alto, Tenor, Bass</strong></li>
            <li><strong>Mute other parts:</strong> Drag Soprano, Alto, and Tenor sliders all the way to the <strong>left (0)</strong></li>
            <li>Leave Bass slider at a moderate level (middle)</li>
            <li>Now only Bass is audible</li>
          </ul>
        </li>
        <li><strong>Listen to Each Part Individually:</strong>
          <ul>
            <li><strong>Bass only:</strong> With only Bass audible, press the <strong>&#9654; play button</strong></li>
            <li>Listen to the Bass part - notice it's the lowest part</li>
            <li>Watch the staff - the red play line follows the Bass notes</li>
            <li>Stop playback (press the <strong>&#9632; stop button</strong>)</li>
            <li><strong>Tenor only:</strong> Mute Bass, unmute Tenor (drag Tenor slider to middle)</li>
            <li>Play and listen to Tenor - notice it's higher than Bass</li>
            <li><strong>Alto only:</strong> Mute Tenor, unmute Alto</li>
            <li>Play and listen to Alto - notice it's higher than Tenor</li>
            <li><strong>Soprano only:</strong> Mute Alto, unmute Soprano</li>
            <li>Play and listen to Soprano - notice it's the highest part</li>
          </ul>
        </li>
        <li><strong>Observe Shape Notes in Each Part:</strong>
          <ul>
            <li>As each part plays, look at the shape notes on the staff</li>
            <li>Notice: All parts use the same shapes (Do, Re, Mi, Fa, So, La, Ti)</li>
            <li>But they're at different pitches (different vertical positions)</li>
            <li>For example: Soprano might sing Do at a high pitch, Bass might sing Do at a low pitch</li>
            <li>The shapes are the same, but the actual frequencies are different</li>
          </ul>
        </li>
        <li><strong>Play All Parts Together:</strong>
          <ul>
            <li>Set all 4 mixer sliders to the same level (middle position)</li>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li>Listen to all 4 parts together - this is harmony!</li>
            <li>Notice how the parts blend together</li>
            <li>Watch the staff - you'll see all 4 parts with their shape notes</li>
            <li>The red play line moves across, showing the current position in the music</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Soprano = highest pitch range</li>
        <li>Alto = second highest</li>
        <li>Tenor = second lowest (but often written in treble clef)</li>
        <li>Bass = lowest pitch range</li>
        <li>All parts use movable Do (same solfege syllables)</li>
        <li>Shape notes appear in all parts</li>
        <li>When all parts play together, they create chords</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you don't see 4 parts on the staff, make sure a hymn is selected</li>
        <li>If mixer sliders don't work, make sure you're dragging them, not clicking</li>
        <li>If playback doesn't start, check that a hymn is loaded</li>
        <li>If parts sound the same, make sure you're muting/unmuting correctly</li>
        <li>If staff is cluttered, adjust Zoom in the Settings sheet (gear ⚙)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify which part (S/A/T/B) is singing when listening to isolated parts (test yourself: have someone else play a random part, or use a random number generator to pick which part to isolate)</p>
      <p><strong>Progression:</strong> Move to 6.2 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 6 remaining sub-lessons (SATB)
function getSubLesson6_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Identify which part matches your vocal range</li>
        <li>Understand how to "aim for" a specific part</li>
        <li>Use the staff visualization to see your target part</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Know Your Vocal Range:</strong>
          <ul>
            <li>If you haven't already, complete <strong>Lesson 2.1 (Finding Your Comfortable Do)</strong> to determine your vocal range</li>
            <li>Based on your comfortable Do setting from that lesson, determine if you're more comfortable in the higher range (Soprano/Alto) or lower range (Tenor/Bass)</li>
            <li>Higher voices (comfortable with Do around D4, E4, F4): likely Soprano or Alto</li>
            <li>Lower voices (comfortable with Do around A3, Bb3, C4): likely Tenor or Bass</li>
          </ul>
        </li>
        <li><strong>Select Your Target Part:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and find <strong>"Aim For Part"</strong></li>
            <li>You'll see 4 buttons: <strong>S, A, T, B</strong></li>
            <li>Click the button that matches your vocal range:
              <ul>
                <li><strong>Soprano (S)</strong>: Highest part, usually for higher voices</li>
                <li><strong>Alto (A)</strong>: Second highest, usually for medium-high voices</li>
                <li><strong>Tenor (T)</strong>: Lower, usually for medium-low voices (but often written high)</li>
                <li><strong>Bass (B)</strong>: Lowest part, usually for lower voices</li>
              </ul>
            </li>
            <li>The selected button should highlight/activate</li>
          </ul>
        </li>
        <li><strong>Set How Loud Your Line Is:</strong>
          <ul>
            <li>Use the <strong>"My part"</strong> control (Normal / Amplify / Quiet) to set how loud your line sits vs the others</li>
            <li>Set it to <strong>"Quiet"</strong> so your part is a little quieter than the rest</li>
            <li>The other parts stay at normal level, so you hear the harmony around you</li>
            <li>This way you can hear your part but also hear the harmony, and you won't just "follow the recording"</li>
            <li>For finer control, open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and use the full mixer</li>
          </ul>
        </li>
        <li><strong>Observe Your Target Part on Staff:</strong>
          <ul>
            <li>Look at the staff</li>
            <li>Your target part should be highlighted or more visible</li>
            <li>Notice the shape notes for your part</li>
            <li>Notice the pitch range (how high/low the notes go)</li>
            <li>Study the melodic line (how the notes move)</li>
          </ul>
        </li>
        <li><strong>Play and Sing Along:</strong>
          <ul>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li><strong>As the music plays, sing along with your target part</strong></li>
            <li>Watch the staff - the red play line shows where you are</li>
            <li>Watch your target part's notes - try to match them</li>
            <li>Turn on the <strong>"Mic"</strong> button in the header - your voice should appear on the staff</li>
            <li>Try to make your voice note align with your target part's notes</li>
          </ul>
        </li>
        <li><strong>Use Tempo Control</strong> (if needed):
          <ul>
            <li>If the music is too fast, open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and find the <strong>"Tempo"</strong> slider</li>
            <li>Drag it to the <strong>left</strong> to slow down (e.g., 50 BPM or 40 BPM)</li>
            <li>Slower tempo = easier to follow and match pitches</li>
            <li>As you improve, gradually increase tempo</li>
          </ul>
        </li>
        <li><strong>Check Your Accuracy:</strong>
          <ul>
            <li>Watch the staff as you sing</li>
            <li>Your voice note (from microphone) should be close to your target part's notes</li>
            <li>If your note is consistently above the target, you might be singing an octave too high</li>
            <li>If your note is consistently below, you might be singing an octave too low</li>
            <li>Adjust your singing to match the target part's pitch range</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Your target part is clearly visible on the staff</li>
        <li>The red play line moves across, showing current position</li>
        <li>Your voice (from mic) appears as a note on the staff</li>
        <li>Your voice note should align with your target part's notes</li>
        <li>Shape notes help you identify which solfege syllable to sing</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear your part, set "My part" to Amplify (or raise it in the mixer)</li>
        <li>If you're just following the recording, set "My part" to Quiet</li>
        <li>If tempo is too fast, slow it down with the tempo slider in the fold</li>
        <li>If your voice doesn't appear on staff, make sure the "Mic" button in the header is on</li>
        <li>If you're singing wrong octave, try singing an octave higher or lower</li>
        <li>If you can't find your part, try a different part (maybe Alto instead of Soprano, etc.)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing your part for a complete SATB exercise with 80%+ pitch accuracy (your voice note aligns with target part notes on staff for most of the exercise)</p>
      <p><strong>Progression:</strong> Move to 6.3 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="satb">Try it: Go to Sing in Parts &rarr;</button></p>
    </div>
  `;
}

function getSubLesson6_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand how each part moves independently</li>
        <li>Recognize common voice leading patterns</li>
        <li>Maintain your part while other parts change</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Set Up for Part Independence Practice:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a hymn</li>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold, set <strong>"Aim For Part"</strong> to your part (S, A, T, or B), and find the mixer</li>
          </ul>
        </li>
        <li><strong>Mute Your Part Completely:</strong>
          <ul>
            <li>In the mixer, drag <strong>your part's slider all the way to the left (0)</strong> - completely mute it</li>
            <li>Set <strong>other parts' volumes to normal</strong> (middle position, 50-60%)</li>
            <li>This way you'll hear the harmony but not your part</li>
          </ul>
        </li>
        <li><strong>Study Your Part Visually First:</strong>
          <ul>
            <li>Before playing, <strong>look at the staff</strong></li>
            <li>Find your part's notes (they should be highlighted or visible)</li>
            <li><strong>Study the melodic line</strong>:
              <ul>
                <li>Where does it start? (which solfege syllable?)</li>
                <li>How does it move? (stepwise? leaps?)</li>
                <li>What are the shape notes? (Do, Re, Mi, etc.)</li>
              </ul>
            </li>
            <li>Try to <strong>memorize the first few notes</strong> of your part</li>
          </ul>
        </li>
        <li><strong>Play and Sing from Memory:</strong>
          <ul>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li><strong>As the other parts play, try to sing your part from memory</strong></li>
            <li>You won't hear your part, so you have to remember it</li>
            <li>Start with just the first measure or two</li>
            <li>Watch the staff - the red play line shows where you are</li>
            <li>Try to sing the correct solfege syllables at the right time</li>
          </ul>
        </li>
        <li><strong>Gradually Unmute to Check:</strong>
          <ul>
            <li>After trying to sing from memory, <strong>stop playback</strong></li>
            <li><strong>Unmute your part slightly</strong> (drag its mixer slider to 20-30%)</li>
            <li><strong>Press play again</strong> and sing along</li>
            <li>Now you can hear your part (quietly) to check if you were right</li>
            <li>If you were close, great! If not, study the part more</li>
          </ul>
        </li>
        <li><strong>Practice in Sections:</strong>
          <ul>
            <li>Don't try to do the whole exercise at once</li>
            <li><strong>Practice the first 4 measures</strong>:
              <ul>
                <li>Mute your part</li>
                <li>Play and sing from memory</li>
                <li>Unmute to check</li>
                <li>Repeat until you can sing those 4 measures correctly</li>
              </ul>
            </li>
            <li>Then <strong>move to the next 4 measures</strong></li>
            <li>Gradually build up to the whole exercise</li>
          </ul>
        </li>
        <li><strong>Use Pitch Distinction for Extra Practice:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room and open <strong>"Pitch Distinction"</strong></li>
            <li>Pick the <strong>Hard</strong> difficulty pill (in the drill's options fold)</li>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li>This practices hearing individual voices in harmony</li>
            <li>Try to identify each tone in the cluster</li>
            <li>This skill helps with part independence</li>
          </ul>
        </li>
        <li><strong>Observe Voice Leading Patterns:</strong>
          <ul>
            <li>When all parts are playing, <strong>watch the staff</strong></li>
            <li>Notice how each part moves:
              <ul>
                <li>Some parts move stepwise (Do→Re→Mi)</li>
                <li>Some parts have leaps (Do→So)</li>
                <li>Some parts hold notes (sustain)</li>
                <li>Some parts rest (no note)</li>
              </ul>
            </li>
            <li><strong>Your part moves independently</strong> - it doesn't always follow the other parts</li>
            <li>This is "voice leading" - each voice has its own path</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Each part has its own melodic line (doesn't just copy others)</li>
        <li>Parts move at different times (some move while others hold)</li>
        <li>Voice leading creates smooth harmony (parts don't jump around randomly)</li>
        <li>Your part has its own rhythm and melody</li>
        <li>Shape notes help you see the solfege for your part</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't remember your part, study it visually first (don't play, just look at the staff)</li>
        <li>If you keep singing other parts instead of yours, focus on your part's shape notes</li>
        <li>If you lose your place, watch the red play line on the staff</li>
        <li>If it's too hard, start with just 2 measures instead of 4</li>
        <li>If you're always wrong, unmute your part more (30-40%) to hear it better while practicing</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Sing your part correctly with your part muted for at least 4 measures (you can maintain your part's melody and rhythm without hearing it)</p>
      <p><strong>Progression:</strong> Move to 6.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson6_4() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Maintain your part while hearing all other parts</li>
        <li>Understand harmonic relationships between parts</li>
        <li>Develop confidence singing in a group setting</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Set Up Balanced Volumes:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a hymn</li>
            <li>Set the <strong>"My part"</strong> control to <strong>"Normal"</strong> so your line sits even with the others</li>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold, set <strong>"Aim For Part"</strong> to your part, and find the mixer</li>
            <li><strong>Set all 4 parts to balanced volumes</strong>:
              <ul>
                <li>Drag all sliders to about <strong>50-60%</strong> (middle position)</li>
                <li>This creates a balanced mix where all parts are equally audible</li>
                <li>You'll hear the full harmony</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Start with Slower Tempo:</strong>
          <ul>
            <li>In the same fold, find the <strong>"Tempo"</strong> slider</li>
            <li>Drag it to <strong>50 BPM</strong> or <strong>40 BPM</strong> (slower than default 60)</li>
            <li>Slower tempo = easier to maintain your part</li>
            <li>You can speed up later as you improve</li>
          </ul>
        </li>
        <li><strong>Play and Sing Your Part:</strong>
          <ul>
            <li>Make sure the <strong>"Mic"</strong> button in the header is on (microphone is active)</li>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li><strong>As all 4 parts play together, sing your part</strong></li>
            <li><strong>Focus on your part</strong> - don't get distracted by other parts</li>
            <li>Watch the staff:
              <ul>
                <li>The red play line shows current position</li>
                <li>Your target part's notes are visible</li>
                <li>Your voice (from mic) should align with your part's notes</li>
              </ul>
            </li>
            <li><strong>Try to maintain your part's melody and rhythm</strong> even when other parts are playing different things</li>
          </ul>
        </li>
        <li><strong>Use Visual Cues:</strong>
          <ul>
            <li><strong>Watch your part's shape notes</strong> on the staff</li>
            <li>The shape notes tell you which solfege syllable to sing</li>
            <li>The vertical position tells you the pitch</li>
            <li>The red play line shows you where you are in the music</li>
            <li><strong>Don't just listen</strong> - use the visual staff to help</li>
          </ul>
        </li>
        <li><strong>Practice Maintaining Your Part:</strong>
          <ul>
            <li>If you find yourself "following" another part (singing what you hear instead of your part):
              <ul>
                <li>Set <strong>"My part"</strong> to <strong>"Quiet"</strong> (make your line quieter)</li>
                <li>This forces you to rely on memory/visual cues rather than just following the sound</li>
                <li>As you improve, set it back to <strong>"Normal"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Gradually Increase Tempo:</strong>
          <ul>
            <li>Once you can sing your part correctly at slow tempo:
              <ul>
                <li>Increase tempo to <strong>55 BPM</strong></li>
                <li>Practice until comfortable</li>
                <li>Increase to <strong>60 BPM</strong> (normal speed)</li>
                <li>Practice until comfortable</li>
                <li>If you want more challenge, increase to <strong>65-70 BPM</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Practice with Chord Quality</strong> (optional):
          <ul>
            <li>Go to the <strong>Ear</strong> room, open <strong>"Chord Quality"</strong>, and set the toggle to <strong>"Explore"</strong></li>
            <li>Pick <strong>"Do (I)"</strong> as the chord root</li>
            <li>Pick <strong>"Major (1-3-5)"</strong> as the chord quality</li>
            <li>Press <strong>"Start Drone"</strong> to hear the I chord (Do-Mi-So)</li>
            <li><strong>Sing individual chord tones</strong> against the drone:
              <ul>
                <li>Sing Do while drone plays Do-Mi-So</li>
                <li>Sing Mi while drone plays Do-Mi-So</li>
                <li>Sing So while drone plays Do-Mi-So</li>
              </ul>
            </li>
            <li>This practices singing one note while hearing a chord</li>
          </ul>
        </li>
        <li><strong>Check Your Accuracy:</strong>
          <ul>
            <li>Watch the staff as you sing</li>
            <li>Your voice note should align with your target part's notes</li>
            <li>If you're consistently off, you might be:
              <ul>
                <li>Singing an octave too high/low</li>
                <li>Singing the wrong part (confusing Soprano with Alto, etc.)</li>
                <li>Not matching the rhythm</li>
              </ul>
            </li>
            <li>Adjust as needed</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>All 4 parts are playing simultaneously</li>
        <li>Your voice aligns with your target part's notes on the staff</li>
        <li>You maintain your part's melody even when other parts play different notes</li>
        <li>The harmony sounds good (all parts blend together)</li>
        <li>Shape notes help you identify which solfege syllable to sing</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you keep singing other parts, set "My part" to Quiet to force independence</li>
        <li>If tempo is too fast, slow it down - there's no rush</li>
        <li>If you lose your place, watch the red play line on the staff</li>
        <li>If harmony sounds bad, you might be singing wrong notes - check the staff</li>
        <li>If you can't hear yourself, you might need to sing louder or adjust mic sensitivity</li>
        <li>If it's overwhelming, practice with just 2 parts first (mute 2 parts in the mixer, keep 2 playing)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing your part through a complete SATB exercise with all parts playing at normal tempo (60 BPM), maintaining accurate pitch and rhythm throughout</p>
      <p><strong>Progression:</strong> Proceed to Lesson 7 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 5 sub-lessons (Chord Quality & Harmony)
function getSubLesson5_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand I chord = Do-Mi-So (identify shapes)</li>
        <li>Understand V chord = So-Ti-Re (identify shapes)</li>
        <li>Understand IV chord = Fa-La-Do (identify shapes)</li>
        <li>Recognize Major vs. minor chord qualities by ear</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Open Chord Quality in Explore mode:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room and open <strong>"Chord Quality"</strong></li>
            <li>Set the segmented toggle to <strong>"Explore"</strong> — this lets you build a chord and hold it as a drone to sing against</li>
            <li>In Explore you pick a root (Do, Re, Mi, Fa, Sol, La, Ti), a quality (Major, Minor, etc.), and an inversion (Root, 1st, 2nd)</li>
          </ul>
        </li>
        <li><strong>Practice I Chord (Do-Mi-So):</strong>
          <ul>
            <li>Pick <strong>"Do (I)"</strong> as the chord root (it will highlight)</li>
            <li>Pick <strong>"Major (1-3-5)"</strong> as the chord quality</li>
            <li>This creates a I chord (tonic chord)</li>
            <li><strong>Look at the staff</strong> - you'll see Do, Mi, So displayed with their shape notes</li>
            <li><strong>Study the shapes</strong>: Notice which shape is Do (Triange), Mi (Diamond), So (oval)</li>
            <li>Press <strong>"Start Drone"</strong> to hear the chord continuously</li>
            <li>You'll hear all 3 notes playing simultaneously (a chord)</li>
            <li><strong>Watch the staff</strong> - the active tones (playing in the drone) will be highlighted brighter</li>
            <li><strong>Listen to the quality</strong> - this is a Major chord (sounds "happy" or "bright")</li>
            <li>Press <strong>"Stop Drone"</strong></li>
          </ul>
        </li>
        <li><strong>Identify Each Chord Tone:</strong>
          <ul>
            <li>While the drone plays, <strong>try to identify each individual tone</strong>:
              <ul>
                <li>Can you hear the Do? (lowest of the three)</li>
                <li>Can you hear the Mi? (middle)</li>
                <li>Can you hear the So? (highest of the three)</li>
              </ul>
            </li>
            <li><strong>Sing along with each tone</strong>:
              <ul>
                <li>Sing Do while drone plays</li>
                <li>Sing Mi while drone plays</li>
                <li>Sing So while drone plays</li>
              </ul>
            </li>
            <li>Turn on the <strong>"Mic"</strong> button in the header - your voice should align with each tone on the staff</li>
          </ul>
        </li>
        <li><strong>Practice V Chord (So-Ti-Re):</strong>
          <ul>
            <li>Press <strong>"Stop Drone"</strong> if it's still playing</li>
            <li>Pick <strong>"Sol (V)"</strong> as the chord root</li>
            <li>Keep <strong>"Major (1-3-5)"</strong> selected as the chord quality</li>
            <li>This creates a V chord (dominant chord)</li>
            <li>Look at the staff - see So, Ti, Re with their shape notes</li>
            <li><strong>Study the shapes</strong>: So (oval), Ti (Ice Cream), Re (Half Circle)</li>
            <li>Press <strong>"Start Drone"</strong> to hear it continuously</li>
            <li><strong>Listen to the quality</strong> - this is also a Major chord</li>
            <li><strong>Try to identify each tone</strong>: So (lowest), Ti (middle), Re (highest)</li>
            <li><strong>Sing along with each tone</strong></li>
          </ul>
        </li>
        <li><strong>Practice IV Chord (Fa-La-Do):</strong>
          <ul>
            <li>Press <strong>"Stop Drone"</strong> if it's still playing</li>
            <li>Pick <strong>"Fa (IV)"</strong> as the chord root</li>
            <li>Keep <strong>"Major (1-3-5)"</strong> selected as the chord quality</li>
            <li>This creates a IV chord (subdominant chord)</li>
            <li>Look at the staff - see Fa, La, Do with their shape notes</li>
            <li><strong>Study the shapes</strong>: Fa (Flag), La (Rectangle), Do (Triangle)</li>
            <li>Press <strong>"Start Drone"</strong> to hear it continuously</li>
            <li><strong>Listen to the quality</strong> - also a Major chord</li>
            <li><strong>Try to identify each tone</strong>: Fa (lowest), La (middle), Do (highest)</li>
            <li><strong>Sing along with each tone</strong></li>
          </ul>
        </li>
        <li><strong>Test yourself in Test me mode:</strong>
          <ul>
            <li>Switch the segmented toggle to <strong>"Test me"</strong></li>
            <li>Press the <strong>&#9654; play button</strong> to hear a chord</li>
            <li><strong>Try to identify each tone</strong> in solfege, then <strong>tap the quality</strong> you hear (Major, Minor, etc.)</li>
            <li>The drill auto-reveals whether you were right — no separate reveal step</li>
            <li>For more practice hearing individual tones stacked together, try <strong>"Pitch Distinction"</strong> in the Ear room</li>
          </ul>
        </li>
        <li><strong>Compare Chord Qualities:</strong>
          <ul>
            <li>Back in <strong>"Explore"</strong> mode</li>
            <li>Play I chord (Do-Mi-So), listen to the quality</li>
            <li>Play V chord (So-Ti-Re), listen to the quality</li>
            <li>Play IV chord (Fa-La-Do), listen to the quality</li>
            <li>Notice: They all sound "Major" (bright, happy, stable)</li>
            <li>But they have different "feels":
              <ul>
                <li>I chord feels like "home" (tonic)</li>
                <li>V chord feels like it "wants to resolve" (dominant)</li>
                <li>IV chord feels "calm" (subdominant)</li>
              </ul>
            </li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>I chord = Do-Mi-So (Triangle, Diamond, oval shapes)</li>
        <li>V chord = So-Ti-Re (oval, Ice cream, Half circle shapes)</li>
        <li>IV chord = Fa-La-Do (Flag, Rectangle, Triangle shapes)</li>
        <li>All three are Major chords (same quality, different roots)</li>
        <li>Each chord has 3 distinct tones you can identify</li>
        <li>Shape notes help you see which solfege syllables are in each chord</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear individual tones, use the Warm Up room's arpeggios to hear each chord tone one at a time</li>
        <li>If chords all sound the same, listen more carefully - they have different "feels"</li>
        <li>If you can't identify tones in a cluster, practice with Pitch Distinction (Ear room) more</li>
        <li>If shapes are confusing, study them one at a time (just I chord first, then add others)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify all 3 tones in I, IV, and V chords 8/10 times (when you hear a chord, you can name all 3 solfege syllables)</p>
      <p><strong>Progression:</strong> Move to 5.2 when benchmark achieved</p>
      <p style="margin-top:8px"><button class="link-btn" data-tab-switch="chord-quality">Try it: Go to Chord Quality &rarr;</button></p>
    </div>
  `;
}

function getSubLesson5_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand how chords progress (I → IV → V → I)</li>
        <li>Recognize chord progressions by ear</li>
        <li>Understand the "feel" of each chord (tonic, subdominant, dominant)</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Set Up Chord Quality in Explore mode:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room, open <strong>"Chord Quality"</strong>, and set the toggle to <strong>"Explore"</strong></li>
            <li>You'll pick a chord root (Do, Re, Mi, Fa, Sol, La, Ti) and a chord quality (Major, Minor, etc.)</li>
            <li>The chord tones display on the staff as soon as you pick a root and quality, and you hold the chord with <strong>"Start Drone"</strong></li>
          </ul>
        </li>
        <li><strong>Practice I → IV → V → I Progression:</strong>
          <ul>
            <li><strong>Step 1 - I Chord</strong>:
              <ul>
                <li>Pick <strong>"Do (I)"</strong> as the chord root</li>
                <li>Pick <strong>"Major (1-3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed with shape notes</li>
                <li>Press <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this is "home" (tonic)</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 2 - IV Chord</strong>:
              <ul>
                <li>Pick <strong>"Fa (IV)"</strong> as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show Fa, La, Do</li>
                <li>Press <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels "calm" or "subdominant"</li>
                <li><strong>Compare to I chord</strong> - how does it feel different?</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 3 - V Chord</strong>:
              <ul>
                <li>Pick <strong>"Sol (V)"</strong> as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show So, Ti, Re</li>
                <li>Press <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels "unresolved" or "wants to go somewhere" (dominant)</li>
                <li><strong>Compare to I and IV</strong> - how does it feel different?</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 4 - Back to I Chord</strong>:
              <ul>
                <li>Pick <strong>"Do (I)"</strong> again as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Watch the staff</strong> - the chord tones will update back to Do, Mi, So</li>
                <li>Press <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels like "resolution" or "coming home"</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Practice the Full Progression:</strong>
          <ul>
            <li><strong>Repeat the progression</strong> (I → IV → V → I) 5-10 times</li>
            <li>Re-pick each root and re-start the drone to move through the chords</li>
            <li>Each time, try to <strong>identify which chord is playing</strong>:
              <ul>
                <li>"This is I" (home)</li>
                <li>"This is IV" (calm)</li>
                <li>"This is V" (unresolved)</li>
                <li>"This is I again" (resolution)</li>
              </ul>
            </li>
            <li><strong>Watch the staff</strong> - you can see the shape notes change as you switch chords</li>
            <li><strong>Feel the progression</strong> - how each chord leads to the next</li>
          </ul>
        </li>
        <li><strong>Practice with Warm Up Arpeggios:</strong>
          <ul>
            <li>Go to the <strong>Warm Up</strong> room</li>
            <li>Check the <strong>"Arpeggios (↑)"</strong> and/or <strong>"Arpeggios (↓)"</strong> checkboxes</li>
            <li>Uncheck other stanzas if you want to focus just on arpeggios</li>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li><strong>Watch the staff</strong> as the arpeggios play</li>
            <li>You'll see I, IV, and V chord arpeggios play sequentially</li>
            <li>Each arpeggio shows the shape notes for that chord (Do-Mi-So for I, Fa-La-Do for IV, So-Ti-Re for V)</li>
            <li>This visual practice helps you see which shape notes belong to each chord in the progression</li>
            <li>Listen to how each chord feels different as the arpeggios play</li>
          </ul>
        </li>
        <li><strong>Practice with Sing in Parts:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a hymn</li>
            <li>Press the <strong>&#9654; play button</strong> and listen</li>
            <li><strong>Try to identify the chord progressions</strong>:
              <ul>
                <li>When do you hear I chord? (sounds like "home")</li>
                <li>When do you hear IV chord? (sounds "calm")</li>
                <li>When do you hear V chord? (sounds "unresolved")</li>
              </ul>
            </li>
            <li><strong>Watch the staff</strong> - you can see the chord tones in the 4 parts</li>
            <li>For example, when all parts sing Do, Mi, So (in different octaves), that's a I chord</li>
          </ul>
        </li>
        <li><strong>Practice Identifying Progressions:</strong>
          <ul>
            <li>Have someone else (or alternate yourself) build a progression in Explore mode</li>
            <li><strong>Listen and identify</strong>:
              <ul>
                <li>"That was I → IV → V → I"</li>
                <li>Or: "That was I → V → I"</li>
                <li>Or: "That was IV → V → I"</li>
              </ul>
            </li>
            <li>Check if you're correct by looking at which chord root and quality are selected</li>
            <li><strong>Watch the staff</strong> - you can see the chord tones change as the progression plays</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>I chord feels like "home" or "resting place"</li>
        <li>IV chord feels "calm" or "stable but not home"</li>
        <li>V chord feels "unresolved" or "wants to resolve to I"</li>
        <li>I → IV → V → I is a common progression</li>
        <li>Each chord has a distinct "feel" or "color"</li>
        <li>In SATB, you can see chord tones in the 4 parts</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If all chords sound the same, listen more carefully to the "feel" or "color"</li>
        <li>If you can't identify progressions, practice individual chords more first</li>
        <li>If Sing in Parts is too complex, stick with Chord Quality for now</li>
        <li>If you're confused, focus on just I and V first (I → V → I is simpler)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify I, IV, and V chords in a progression 8/10 times (when you hear a chord change, you can name which chord it is)</p>
      <p><strong>Progression:</strong> Move to 5.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson5_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand minor chords (lowercase roman numerals: i, iv, v)</li>
        <li>Recognize minor chord "darker" quality vs. Major "brighter" quality</li>
        <li>Identify minor chords in shape note notation</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Compare Major vs. Minor I Chord:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room, open <strong>"Chord Quality"</strong>, and set the toggle to <strong>"Explore"</strong></li>
            <li><strong>Major I chord</strong>:
              <ul>
                <li>Pick <strong>"Do (I)"</strong> as the chord root</li>
                <li>Pick <strong>"Major (1-3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed with shape notes</li>
                <li>Press <strong>"Start Drone"</strong>, listen for 3-4 seconds</li>
                <li><strong>Notice the quality</strong> - "bright" or "happy"</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Minor i chord</strong>:
              <ul>
                <li>Keep <strong>"Do (I)"</strong> selected as the chord root</li>
                <li>Pick <strong>"Minor (1-♭3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show Do, Me, So (Me = lowered Mi)</li>
                <li>Notice how the shape note for the 3rd changes (Mi becomes Me with an accidental)</li>
                <li>Press <strong>"Start Drone"</strong>, listen for 3-4 seconds</li>
                <li><strong>Notice the quality</strong> - "darker" or "sadder" than Major</li>
                <li><strong>Compare</strong>: Major sounds "bright", minor sounds "dark"</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Practice Identifying Major vs. Minor:</strong>
          <ul>
            <li>Have someone (or alternate yourself) play:
              <ul>
                <li>Major I chord (Do, Mi, So)</li>
                <li>Minor i chord (Do, Me, So)</li>
              </ul>
            </li>
            <li><strong>Listen and identify</strong>: "That's Major" or "That's minor"</li>
            <li>Practice until you can consistently tell the difference</li>
          </ul>
        </li>
        <li><strong>Practice Minor iv and v Chords:</strong>
          <ul>
            <li><strong>Minor iv chord</strong>:
              <ul>
                <li>Pick <strong>"Fa (IV)"</strong> as the chord root</li>
                <li>Pick <strong>"Minor (1-♭3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - you'll see Fa, La♭, Do (La lowered to La♭)</li>
                <li>Notice how the shape note for La changes (with an accidental)</li>
                <li>Press <strong>"Start Drone"</strong>, listen to the quality - "darker" than Major IV</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Minor v chord</strong>:
              <ul>
                <li>Pick <strong>"Sol (V)"</strong> as the chord root</li>
                <li>Pick <strong>"Minor (1-♭3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - you'll see So, Ti♭, Re (Ti lowered to Ti♭)</li>
                <li>Notice how the shape note for Ti changes (with an accidental)</li>
                <li>Press <strong>"Start Drone"</strong>, listen to the quality - "darker" than Major V</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Switch Between Qualities:</strong>
          <ul>
            <li>In <strong>"Chord Quality"</strong> (Explore mode), keep a root fixed and switch the quality</li>
            <li>Pick <strong>"Major (1-3-5)"</strong>, then hold the drone to hear the bright quality</li>
            <li>Pick <strong>"Minor (1-♭3-5)"</strong>, then hold the drone to hear the dark quality</li>
            <li><strong>Watch the staff</strong> - you'll see the chord tones update and the shape notes change</li>
            <li><strong>Practice switching</strong> between Major and minor for the same root</li>
            <li>Really listen to the difference and watch how the shape notes reflect the change</li>
          </ul>
        </li>
        <li><strong>Practice with Warm Up Arpeggios:</strong>
          <ul>
            <li>Go to the <strong>Warm Up</strong> room</li>
            <li>Check the <strong>"Arpeggios (↑)"</strong> and/or <strong>"Arpeggios (↓)"</strong> checkboxes</li>
            <li>Press the <strong>&#9654; play button</strong></li>
            <li><strong>Watch the staff</strong> as the arpeggios play</li>
            <li>Notice how Major chord arpeggios (I, IV, V) have different shape notes than minor chord arpeggios (ii, iii, vi)</li>
            <li>This visual practice helps you see the shape note differences between Major and minor chords</li>
            <li>Listen to the quality difference as each arpeggio plays</li>
          </ul>
        </li>
        <li><strong>Practice with Sing in Parts:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a hymn that has minor chords</li>
            <li>Press the <strong>&#9654; play button</strong> and listen</li>
            <li><strong>Try to identify</strong>: "That section has minor chords" vs. "That section has Major chords"</li>
            <li><strong>Watch the staff</strong> - minor chords will have lowered 3rds (Me instead of Mi, etc.)</li>
            <li>Shape notes help you see which tones are in the chord</li>
          </ul>
        </li>
        <li><strong>Understand Roman Numeral Notation:</strong>
          <ul>
            <li><strong>Uppercase</strong> (I, IV, V) = Major chords</li>
            <li><strong>Lowercase</strong> (i, iv, v) = minor chords</li>
            <li>In the app, you might see this notation</li>
            <li><strong>Major I</strong> = Do-Mi-So (bright)</li>
            <li><strong>minor i</strong> = Do-Me-So (dark)</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Major chords sound "bright", "happy", "stable"</li>
        <li>Minor chords sound "dark", "sad", "moody"</li>
        <li>The difference is in the 3rd of the chord (Mi vs. Me)</li>
        <li>Shape notes show the difference (Mi shape vs. Me shape with accidental)</li>
        <li>Roman numerals: uppercase = Major, lowercase = minor</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear the difference, play Major and minor back-to-back repeatedly</li>
        <li>If the app doesn't have minor chord support, focus on understanding the concept theoretically</li>
        <li>If you're confusing Major and minor, practice with just I and i first</li>
        <li>If accidentals are confusing, that's normal - focus on the sound quality difference</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly distinguish Major vs. minor chords 8/10 times (when you hear a chord, you can identify if it's Major or minor)</p>
      <p><strong>Progression:</strong> Move to 5.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson5_4() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand inversions (chord starting on different tones)</li>
        <li>Recognize voice leading patterns in SATB</li>
        <li>Understand how shape notes help identify voice leading</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Understand Chord Inversions:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room, open <strong>"Chord Quality"</strong>, and set the toggle to <strong>"Explore"</strong></li>
            <li><strong>Root position I chord</strong>:
              <ul>
                <li>Pick <strong>"Do (I)"</strong> as the chord root</li>
                <li>Pick <strong>"Major (1-3-5)"</strong> as the chord quality</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed (Do is the lowest note shown)</li>
                <li>Press <strong>"Start Drone"</strong>, listen</li>
                <li>Notice Do is the bass (lowest note in the chord)</li>
                <li>Press <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Understanding Inversions:</strong>
              <ul>
            <li>Explore mode has inversion buttons (Root, 1st, 2nd) that let you hear different voicings of the same chord</li>
            <li><strong>Root position</strong> (default): Do is the lowest note (Do, Mi, So)</li>
            <li><strong>First inversion</strong>: Click the "1st" button - Mi becomes the lowest note (Mi, So, Do)</li>
            <li><strong>Second inversion</strong>: Click the "2nd" button - So becomes the lowest note (So, Do, Mi)</li>
            <li>This is the same chord (Do-Mi-So) but "inverted" - different notes are in the bass</li>
            <li>Click the inversion buttons to hear how the chord sounds different with different bass notes</li>
            <li>In SATB, you'll see inversions when the bass part doesn't sing the root</li>
              </ul>
            </li>
            <li><strong>Practice with Warm Up Arpeggios:</strong>
              <ul>
                <li>Go to the <strong>Warm Up</strong> room</li>
                <li>Check the <strong>"Arpeggios (↑)"</strong> checkbox</li>
                <li>Press the <strong>&#9654; play button</strong></li>
                <li><strong>Watch the staff</strong> - arpeggios show root position chords (root is always the first note)</li>
                <li>Notice how each arpeggio starts on the root (Do for I chord, Fa for IV chord, So for V chord)</li>
                <li>This helps you understand the base chord structure before learning inversions</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Analyze Voice Leading in Sing in Parts:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a hymn</li>
            <li><strong>Play it slowly</strong> — open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and set tempo to 50 BPM, then press the <strong>&#9654; play button</strong></li>
            <li><strong>Watch the staff carefully</strong> as it plays</li>
            <li><strong>Observe how each part moves</strong>:
              <ul>
                <li>Does it move stepwise? (Do→Re→Mi)</li>
                <li>Does it leap? (Do→So)</li>
                <li>Does it hold? (sustain a note)</li>
                <li>Does it rest? (no note)</li>
              </ul>
            </li>
            <li><strong>Notice voice leading patterns</strong>:
              <ul>
                <li>Parts often move in opposite directions (one goes up, another goes down)</li>
                <li>Parts avoid crossing (Soprano stays above Alto, etc.)</li>
                <li>Smooth voice leading = small steps, not big leaps</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Identify Chord Inversions in Sing in Parts:</strong>
          <ul>
            <li>Press the <strong>&#9654; play button</strong> and watch the staff</li>
            <li><strong>Look for chord moments</strong> (when all 4 parts have notes at the same time)</li>
            <li><strong>Identify the bass note</strong> (lowest note in Bass part)</li>
            <li><strong>If bass sings Do</strong> and other parts sing Mi, So = root position I chord</li>
            <li><strong>If bass sings Mi</strong> and other parts sing So, Do = first inversion I chord</li>
            <li><strong>If bass sings So</strong> and other parts sing Do, Mi = second inversion I chord</li>
            <li><strong>Shape notes help</strong> - you can see which solfege syllable the bass is singing</li>
          </ul>
        </li>
        <li><strong>Practice with Pitch Distinction:</strong>
          <ul>
            <li>Go to the <strong>Ear</strong> room and open <strong>"Pitch Distinction"</strong></li>
            <li>Pick the <strong>Hard</strong> or <strong>Expert</strong> difficulty pill (in the drill's options fold)</li>
            <li>Press the <strong>&#9654; play button</strong> to hear the tones stacked together</li>
            <li>This practices hearing complex harmony</li>
            <li><strong>Try to identify each tone</strong> in the cluster</li>
            <li><strong>Try to identify the chord</strong> (is it I? IV? V? Major? minor?)</li>
            <li><strong>Tap the answer</strong> to auto-reveal whether you were right</li>
          </ul>
        </li>
        <li><strong>Practice All Chord Types:</strong>
          <ul>
            <li>Go to <strong>"Chord Quality"</strong> (Explore mode) in the Ear room</li>
            <li><strong>Practice different chord types</strong> using the chord quality buttons:
              <ul>
                <li>Major (1-3-5) - for I, IV, V chords</li>
                <li>Minor (1-♭3-5) - for i, iv, v chords</li>
                <li>Other types if available (diminished, augmented, etc.)</li>
              </ul>
            </li>
            <li><strong>Practice different roots</strong> using the chord root buttons:
              <ul>
                <li>I chord (Do root)</li>
                <li>ii chord (Re root)</li>
                <li>iii chord (Mi root)</li>
                <li>IV chord (Fa root)</li>
                <li>V chord (Sol root)</li>
                <li>vi chord (La root)</li>
                <li>vii° chord (Ti root)</li>
              </ul>
            </li>
            <li><strong>Watch the staff</strong> - chord tones update automatically when you change root, quality, or inversion</li>
            <li><strong>Listen to the quality</strong> of each chord - hold the drone to hear it sustained</li>
            <li><strong>Try different inversions</strong> - click Root, 1st, or 2nd to hear how the bass note changes the sound</li>
            <li><strong>Identify the chord tones</strong> by shape notes on the staff</li>
          </ul>
        </li>
        <li><strong>Sing Through a Complete Hymn:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> and pick a complete hymn</li>
            <li>Set the <strong>"My part"</strong> control (Normal / Amplify / Quiet) for how loud your line sits vs the others; set your aim part, balanced mixer, and tempo (start at 50-60 BPM) in the <strong>"Part, tempo, key &amp; mixer"</strong> fold</li>
            <li>Press the <strong>&#9654; play button</strong> and sing your part through the entire piece</li>
            <li><strong>As you sing, try to identify chord progressions</strong>:
              <ul>
                <li>"This section is I → IV → V → I"</li>
                <li>"This chord is minor"</li>
                <li>"This is an inversion - the bass is singing Mi, not Do"</li>
              </ul>
            </li>
            <li><strong>Watch the staff</strong> - shape notes help you see the harmony</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Chord inversions: same chord tones, different bass note</li>
        <li>Voice leading: smooth movement between chords (small steps preferred)</li>
        <li>Chord progressions: I → IV → V → I, etc.</li>
        <li>Shape notes help identify which solfege syllables are in each chord</li>
        <li>In SATB, you can see all 4 parts and how they create harmony</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If inversions are confusing, focus on root position chords first</li>
        <li>If voice leading is hard to see, slow down the tempo significantly</li>
        <li>If chord identification is difficult, practice with Chord Quality more</li>
        <li>If Sing in Parts is overwhelming, practice with just 2 parts first (mute 2 parts in the mixer)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing a complete SATB piece with accurate pitch and rhythm, identifying chord progressions as you sing (you can name at least 3-4 chord progressions during the piece, e.g., "That was I → IV → V → I")</p>
      <p><strong>Progression:</strong> Proceed to Lesson 6 when benchmark achieved</p>
    </div>
  `;
}

function renderLesson5() {
  return `
    <section class="lesson" id="lesson-5" data-lesson="5">
      <div class="lesson-header" data-lesson-toggle="5">
        <h2>Lesson 5: Chord Quality &amp; Harmony</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="5">
        <p class="lesson-goal"><strong>Goal:</strong> Understand chord structure, qualities, and progressions</p>

        <div class="warmup-connection">
          <strong>Warmup Connection: Arpeggios</strong>
          The <strong>Arpeggios</strong> stanza directly trains chord hearing. Each arpeggio you sing is a chord played one note at a time.
          The I chord (Do-Mi-Sol) arpeggio you've been singing every warmup? That's the major triad.
          The ii chord (Re-Fa-La)? That's a minor triad.
          Your daily arpeggios have been teaching you chord quality all along.
        </div>

        ${renderSubLesson('5.1', 'Triads and Chord Qualities (Shape Note Focus)', getSubLesson5_1())}
        ${renderSubLesson('5.2', 'Chord Progressions (I, IV, V)', getSubLesson5_2())}
        ${renderSubLesson('5.3', 'Minor Chords and Other Qualities', getSubLesson5_3())}
        ${renderSubLesson('5.4', 'Inversions and Advanced Harmony', getSubLesson5_4())}
      </div>
    </section>
  `;
}

function getSubLesson6_5() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Use the Sing in Parts screen to sing a hymn together, in person, as a group</li>
        <li>Set a comfortable shared key and tempo for the whole group</li>
        <li>Follow your own part on the engraved staff while hearing the people around you</li>
      </ul>
    </div>

    <p>You don't need any special "group" mode or a server — the Sing in Parts screen is all you need for a room full of people to sing a hymn together. Everyone opens the same hymn on their own phone, follows their own part, and sings.</p>

    <div class="app-instructions">
      <h4>Setting up a group sing:</h4>
      <ol>
        <li><strong>Everyone loads the same hymn:</strong>
          <ul>
            <li>On each phone, go to the <strong>Sing</strong> room, open <strong>"Sing in Parts"</strong>, and tap <strong>"Browse hymns"</strong></li>
            <li>Pick the same hymn on every device</li>
          </ul>
        </li>
        <li><strong>Each singer picks their part:</strong>
          <ul>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and under <strong>"Aim For Part"</strong>, choose the part you're singing (S, A, T, or B)</li>
            <li>Use the <strong>"My part"</strong> control (Normal / Amplify / Quiet) to lean on your line, or keep it Normal to hear the full harmony</li>
          </ul>
        </li>
        <li><strong>Agree on a key and tempo:</strong>
          <ul>
            <li>In that same fold, use the <strong>Key</strong> transpose buttons (− / +) so the pitch sits comfortably for the group's voices</li>
            <li>The hymn loads at its own tempo; nudge the <strong>Tempo</strong> slider slower for a first read-through</li>
            <li>Make sure everyone matches the same key and tempo</li>
          </ul>
        </li>
        <li><strong>Put in one earbud:</strong>
          <ul>
            <li>Wear a single earbud (or one side of your headphones), leaving the <strong>other ear open</strong></li>
            <li>Your phone plays the parts in the earbud; your open ear hears the people singing around you — that's how you stay together as a group</li>
          </ul>
        </li>
        <li><strong>Start together on a count:</strong>
          <ul>
            <li>Have one person count off — "three, two, one, sing" — and everyone presses the <strong>&#9654; play button</strong> on that beat</li>
            <li>Because every phone plays the same hymn at the same tempo, once you start together you stay together for the whole song</li>
            <li>Sing your part from the scrolling staff; the play line shows where you are</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="key-insight">
      <strong>Why one earbud?</strong> It's the trick that makes group singing work: the earbud keeps you locked to the notes, while your open ear keeps you locked to the people. Two ears of recording and you'd only hear yourself; two ears of the room and you'd drift off pitch. One of each keeps you both in tune and together.
    </div>`;
}

function renderLesson6() {
  return `
    <section class="lesson" id="lesson-6" data-lesson="6">
      <div class="lesson-header" data-lesson-toggle="6">
        <h2>Lesson 6: Singing in Parts</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="6">
        <p class="lesson-goal"><strong>Goal:</strong> Sing your part in 4-voice harmony</p>

        <div class="warmup-connection">
          <strong>Warmup Connection: Everything Comes Together</strong>
          SATB singing uses EVERYTHING from warmup. <strong>Scales</strong> give you the melodic patterns each voice part follows.
          <strong>Intervals from Do</strong> let you find your starting note relative to the key.
          <strong>Arpeggios</strong> let you hear how your note fits into the chord the other 3 parts form around you.
          Before attempting an SATB piece, do a full warmup — it's what professional choirs do before every rehearsal.
        </div>

        ${renderSubLesson('6.1', 'Understanding SATB Structure', getSubLesson6_1())}
        ${renderSubLesson('6.2', 'Finding Your Part in Harmony', getSubLesson6_2())}
        ${renderSubLesson('6.3', 'Voice Leading and Part Independence', getSubLesson6_3())}
        ${renderSubLesson('6.4', 'Singing Against Other Parts', getSubLesson6_4())}
        ${renderSubLesson('6.5', 'Singing Together in Person', getSubLesson6_5())}
      </div>
    </section>
  `;
}

function renderLesson7() {
  return `
    <section class="lesson" id="lesson-7" data-lesson="7">
      <div class="lesson-header" data-lesson-toggle="7">
        <h2>Lesson 7: FA SO LA Tradition</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="7">
        <p class="lesson-goal"><strong>Goal:</strong> Understand sacred harp singing tradition and practice with real hymns</p>

        ${renderSubLesson('7.1', 'Understanding the FA SO LA Tradition', getSubLesson7_1())}
        ${renderSubLesson('7.2', 'Importing and Practicing with Hymn MIDI Files', getSubLesson7_2())}
        ${renderSubLesson('7.3', 'Singing Together with Sing in Parts', getSubLesson7_3())}
      </div>
    </section>
  `;
}

function getSubLesson7_3() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Recreate a traditional FA SO LA singing in miniature using the Sing in Parts screen</li>
        <li>Sit in parts and sing a tune together on solfege before adding the words</li>
        <li>Use each phone as a quiet section leader so the whole group stays anchored</li>
      </ul>
    </div>

    <p>The old singing schools always ran a tune through on the syllables first — everyone "sang the notes" (FA SO LA) before ever touching the lyrics. The Sing in Parts screen lets a small group do exactly that, together, in one room.</p>

    <div class="app-instructions">
      <h4>Running a FA SO LA reading:</h4>
      <ol>
        <li><strong>Sit in your parts.</strong> Gather by voice — soprano, alto, tenor, bass — so you hear the singers on your own line beside you, just like a shape-note square.</li>
        <li><strong>Load the same tune on every phone.</strong> Go to the <strong>Sing</strong> room, open <strong>"Sing in Parts"</strong>, tap <strong>"Browse hymns"</strong>, and pick the same hymn on each device.</li>
        <li><strong>Pick your part and lean on it.</strong> In the <strong>"Part, tempo, key &amp; mixer"</strong> fold set <strong>"Aim For Part"</strong> to your voice, then set the <strong>"My part"</strong> control to <strong>"Amplify"</strong> so your phone acts as a quiet section leader.</li>
        <li><strong>Sing the syllables first.</strong> Read the movable-Do syllable under each note and sing the tune on solfege — no words yet. Do this once or twice until the notes are solid.</li>
        <li><strong>Then add the words.</strong> Once the group can carry the tune on syllables, run it again singing the lyrics. The notes are already in your ear.</li>
      </ol>
    </div>

    <div class="key-insight">
      <strong>Notes before words.</strong> Singing the syllables first is the heart of the FA SO LA method: it teaches the tune to your ear cleanly, so when the words arrive you're free to think about phrasing instead of pitch.
    </div>

    <p>For the in-person logistics — agreeing on a key and tempo, the one-earbud trick, and starting together on a count — see <strong>Lesson 6.5: Singing Together in Person</strong>.</p>`;
}

function getSubLesson7_1() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand the historical context of solfege-only singing</li>
        <li>Learn how this practice builds ear training and part independence</li>
        <li>Prepare for importing and practicing with your own hymn MIDI files</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Understanding the Tradition:</h4>
      <p>In the old days, church singers would gather together and sit in their parts (Soprano, Alto, Tenor, Bass) and sing tunes using only solfege syllables—no lyrics. This practice, often called "FA SO LA" singing (after the syllables), was a fundamental way to:</p>
      <ul>
        <li><strong>Build ear training:</strong> By focusing on pitch relationships without the distraction of words</li>
        <li><strong>Develop part independence:</strong> Singers learn to hold their own part while hearing other parts</li>
        <li><strong>Master harmony:</strong> Understanding how different parts create chords and progressions</li>
        <li><strong>Improve sight-reading:</strong> Reading music becomes more intuitive when you think in solfege</li>
      </ul>
      <p>This app allows you to practice this traditional method on your own, with real-time feedback to help you stay on pitch and in time.</p>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Your ability to sing the correct solfege syllable at the right time</li>
        <li>Staying in tune with your part while other parts play</li>
        <li>Maintaining rhythm and tempo</li>
        <li>Hearing how your part fits into the overall harmony</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you're struggling to stay on pitch, start with just your part playing (mute others)</li>
        <li>If rhythm is difficult, slow down the tempo significantly</li>
        <li>If you're getting lost, practice one phrase at a time</li>
        <li>Use the microphone feedback to see if you're singing the correct pitch</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Understand the purpose and benefits of FA SO LA singing practice. You're ready to move on when you can explain why this method is valuable for ear training.</p>
      <p><strong>Progression:</strong> Once you understand the tradition, proceed to Sub-lesson 7.2 to learn how to import and practice with your own hymn MIDI files.</p>
    </div>
  `;
}

function getSubLesson7_2() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Learn how to import your own hymn MIDI files into the app</li>
        <li>Understand how the app processes and splits MIDI files into SATB parts</li>
        <li>Practice FA SO LA singing with your own hymn collection</li>
        <li>Use microphone feedback to verify pitch accuracy</li>
        <li>Master singing your part while hearing other parts</li>
      </ul>
    </div>

    <div class="app-instructions">
      <h4>Detailed App Instructions:</h4>
      <ol>
        <li><strong>Find or Create Hymn MIDI Files:</strong>
          <ul>
            <li>You'll need MIDI files (.mid or .midi format) of hymns you want to practice</li>
            <li>Many websites offer free hymn MIDI files (search for "hymn MIDI files" or "shape note MIDI")</li>
            <li>You can also create MIDI files using music notation software if you have sheet music</li>
            <li>Look for files that have 4-part harmony (SATB) for best results</li>
            <li>Files with 1-2 tracks can work too - the app will intelligently split them into 4 parts</li>
          </ul>
        </li>
        <li><strong>Open Sing in Parts:</strong>
          <ul>
            <li>Go to the <strong>Sing</strong> room and open <strong>"Sing in Parts"</strong></li>
            <li>Tap <strong>"Browse hymns"</strong> to pick from the built-in hymns, and open the <strong>"Part, tempo, key &amp; mixer"</strong> fold to find <strong>"load your own MIDI file"</strong></li>
          </ul>
        </li>
        <li><strong>Import Your MIDI File:</strong>
          <ul>
            <li>In the <strong>"Part, tempo, key &amp; mixer"</strong> fold, find <strong>"load your own MIDI file"</strong></li>
            <li>Tap it and choose your MIDI file (or the area that says "Select a MIDI file...")</li>
            <li>Navigate to your MIDI file on your device and select it</li>
            <li>The app will begin processing the file - this may take a few seconds</li>
            <li>You'll see a loading message in the badge area</li>
          </ul>
        </li>
        <li><strong>Select the Key Signature (if prompted):</strong>
          <ul>
            <li>If the MIDI file doesn't have an explicit key signature, a dialog will appear</li>
            <li>The app will show a <strong>"Best guess"</strong> key with a confidence percentage</li>
            <li>Review the guess - if it looks correct, you can accept it</li>
            <li>If the guess seems wrong, select the correct key from the dropdown</li>
            <li>Also select whether the piece is in <strong>Major</strong> or <strong>Minor</strong> mode</li>
            <li>Click <strong>"OK"</strong> to continue (or <strong>"Cancel"</strong> if you want to try a different file)</li>
            <li><strong>Why this matters:</strong> The key signature determines which solfege syllables correspond to which notes, so getting it right is important for accurate shape note display</li>
            <li><strong>Note:</strong> To see the key signature on the staff, enable "Show Accidentals & Key" in the Settings sheet (gear ⚙) (this setting works globally across all rooms, not just in Sing in Parts)</li>
            <li><strong>Important:</strong> Sing in Parts uses the MIDI file's key signature (if available), while other rooms use the "Do" setting (movable Do) as the key signature</li>
          </ul>
        </li>
        <li><strong>Verify the Import:</strong>
          <ul>
            <li>Once loaded, the new hymn will appear in the <strong>"Browse hymns"</strong> list</li>
            <li>The file name (without .mid extension) will be used as the hymn name</li>
            <li>The staff will automatically display all four parts (Soprano, Alto, Tenor, Bass)</li>
            <li>You'll see the shape notes for each part based on the key signature you selected</li>
            <li>If the parts look wrong (e.g., all notes in one part), the MIDI file structure might be unusual - try a different file</li>
          </ul>
        </li>
        <li><strong>Select Your Imported Hymn:</strong>
          <ul>
            <li>Tap <strong>"Browse hymns"</strong> and select your newly imported hymn</li>
            <li>The staff will update to show that hymn's notation</li>
            <li>You can switch between different imported hymns from this list</li>
          </ul>
        </li>
        <li><strong>Choose Your Part:</strong>
          <ul>
            <li>Open the <strong>"Part, tempo, key &amp; mixer"</strong> fold and set <strong>"Aim For Part"</strong> to the part you want to practice (S, A, T, or B)</li>
            <li>Your part will be highlighted on the staff</li>
            <li>Start with the part that's most comfortable for your voice range</li>
          </ul>
        </li>
        <li><strong>Set How Loud Your Line Is:</strong>
          <ul>
            <li>Use the <strong>"My part"</strong> control (Normal / Amplify / Quiet) — set it to <strong>"Quiet"</strong></li>
            <li>This is important! You want to hear yourself sing, not just follow the recording</li>
            <li>The other parts stay at normal level so you can hear the harmony</li>
            <li>For finer balance, use the full mixer in the <strong>"Part, tempo, key &amp; mixer"</strong> fold</li>
            <li>This simulates singing in a group where you need to hold your own part</li>
          </ul>
        </li>
        <li><strong>Set Tempo:</strong>
          <ul>
            <li>In the <strong>"Part, tempo, key &amp; mixer"</strong> fold, start with a slow tempo (50-60 BPM) to give yourself time to think</li>
            <li>As you improve, gradually increase the tempo</li>
            <li>You can adjust this during playback if needed</li>
          </ul>
        </li>
        <li><strong>Enable Microphone (Optional but Recommended):</strong>
          <ul>
            <li>Tap the <strong>"Mic"</strong> button in the header to enable microphone input</li>
            <li>Allow microphone access when prompted by your browser</li>
            <li>The app will show your detected pitch on the staff in real-time (see the live "Mic: — Hz | Δ cents" readout)</li>
            <li>This gives you visual feedback on whether you're singing the correct pitch</li>
          </ul>
        </li>
        <li><strong>Practice Singing Solfege:</strong>
          <ul>
            <li>Press the <strong>&#9654; play button</strong> to start</li>
            <li>As the music plays, <strong>sing the solfege syllables</strong> for your part:
              <ul>
                <li>Look at the shape notes on the staff for your part</li>
                <li>Identify which solfege syllable each note represents (Do, Re, Mi, Fa, So, La, Ti)</li>
                <li>Sing the syllable as the note plays</li>
              </ul>
            </li>
            <li><strong>Don't sing lyrics</strong> - only solfege syllables!</li>
            <li>Try to stay in time with the playhead (red line) on the staff</li>
            <li>Watch the staff - your detected pitch (if mic is on) will show if you're on target</li>
          </ul>
        </li>
        <li><strong>Practice Techniques:</strong>
          <ul>
            <li><strong>Start with just your part:</strong> Mute all other parts (set volumes to 0) and practice your part alone first</li>
            <li><strong>Add one part at a time:</strong> Once comfortable, add one other part, then gradually add more</li>
            <li><strong>Practice in sections:</strong> Focus on one phrase at a time before attempting the whole piece</li>
            <li><strong>Use the playhead:</strong> The red line shows where you should be in the music - try to stay synchronized</li>
            <li><strong>Loop difficult sections:</strong> Use pause/play to repeat challenging parts</li>
          </ul>
        </li>
        <li><strong>Build Your Hymn Collection:</strong>
          <ul>
            <li>Import multiple hymns to build a practice library</li>
            <li>Each imported hymn stays in the "Browse hymns" list until you refresh the page</li>
            <li>Try importing hymns in different keys to practice various key signatures</li>
            <li>Mix major and minor hymns to experience different harmonic colors</li>
            <li>Practice the same hymn in different parts (S, A, T, B) to build flexibility</li>
          </ul>
        </li>
        <li><strong>Advanced Practice:</strong>
          <ul>
            <li>Once you can sing your part accurately, try switching parts mid-song</li>
            <li>Practice with different tempos to build flexibility</li>
            <li>Try singing without looking at the staff (ear training)</li>
            <li>Practice with key signature changes (if the piece modulates)</li>
            <li>Transpose hymns to different keys using the transpose buttons (+/-) to practice in various ranges</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>Where to Find Hymn MIDI Files:</h4>
      <ul>
        <li><strong>Online repositories:</strong> Search for "hymn MIDI files", "shape note MIDI", or "Sacred Harp MIDI"</li>
        <li><strong>Church music resources:</strong> Many churches and music ministries share MIDI files</li>
        <li><strong>Music notation software:</strong> If you have sheet music, you can create MIDI files using programs like MuseScore, Finale, or Sibelius</li>
        <li><strong>File formats:</strong> The app accepts .mid and .midi files</li>
        <li><strong>Best results:</strong> Files with 4 separate tracks (one per voice) work best, but the app can also handle 1-2 track files</li>
      </ul>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li><strong>Pitch accuracy:</strong> Your detected pitch (green line on staff) should match the note you're singing</li>
        <li><strong>Rhythm accuracy:</strong> You should be singing each syllable at the right time</li>
        <li><strong>Part independence:</strong> You should be able to hold your part even when other parts are playing different notes</li>
        <li><strong>Solfege fluency:</strong> You should be able to identify and sing the correct syllable without hesitation</li>
        <li><strong>Harmony awareness:</strong> You should hear how your part fits into the overall chord structure</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li><strong>If you're singing the wrong pitch:</strong>
          <ul>
            <li>Check that you're looking at the correct part (your part should be highlighted)</li>
            <li>Make sure you're identifying the correct solfege syllable from the shape note</li>
            <li>Use the microphone feedback to see where your pitch is vs. where it should be</li>
            <li>Practice with just your part first to build confidence</li>
          </ul>
        </li>
        <li><strong>If you're getting lost rhythmically:</strong>
          <ul>
            <li>Slow down the tempo significantly (40-50 BPM)</li>
            <li>Watch the playhead (red line) to see where you should be</li>
            <li>Practice one phrase at a time, pausing between phrases</li>
            <li>Count beats out loud if needed</li>
          </ul>
        </li>
        <li><strong>If other parts are distracting you:</strong>
          <ul>
            <li>Mute other parts and practice your part alone first</li>
            <li>Gradually add other parts one at a time</li>
            <li>Start with just one other part (e.g., if you're singing Soprano, add Alto first)</li>
          </ul>
        </li>
        <li><strong>If you can't identify the solfege syllables:</strong>
          <ul>
            <li>Review Lesson 1 on shape notes and solfege</li>
            <li>Use Flashcards (Learn room) to practice shape-to-solfege recognition</li>
            <li>Slow down and identify each note before singing</li>
            <li>Check the key signature - it affects which solfege syllable each note represents</li>
            <li>Enable "Show Accidentals & Key" in the Settings sheet (gear ⚙) to see the key signature at the start of the staff</li>
          </ul>
        </li>
        <li><strong>If microphone isn't working:</strong>
          <ul>
            <li>Check browser permissions - allow microphone access</li>
            <li>Make sure your microphone is connected and working</li>
            <li>Try refreshing the page and enabling mic again</li>
            <li>You can still practice without mic feedback - just use your ear</li>
          </ul>
        </li>
        <li><strong>If MIDI file won't load or looks wrong:</strong>
          <ul>
            <li>Make sure the file is a valid .mid or .midi file (not MP3, WAV, or other audio formats)</li>
            <li>Try a different MIDI file - some files may have unusual structures</li>
            <li>Check that the file isn't corrupted - try opening it in another MIDI player first</li>
            <li>If parts are all in one voice, the file might be a single-track melody - this is okay, but the app will try to split it intelligently</li>
            <li>If the key signature guess seems wrong, make sure you select the correct key in the dialog</li>
            <li>Very short files (under 1 second) or very long files (over 10 minutes) might not work well</li>
          </ul>
        </li>
        <li><strong>If the app says "Error loading MIDI":</strong>
          <ul>
            <li>The file might be corrupted or in an unsupported format</li>
            <li>Try a different MIDI file to see if the problem persists</li>
            <li>Make sure your browser supports file reading (modern browsers should)</li>
            <li>Check the browser console (F12) for detailed error messages</li>
          </ul>
        </li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully import at least 2-3 of your own hymn MIDI files and sing through each one using only solfege syllables (no lyrics) while maintaining accurate pitch and rhythm. You should be able to:</p>
      <ul>
        <li>Import MIDI files without errors</li>
        <li>Correctly identify the key signature when prompted</li>
        <li>Sing your part accurately while other parts are playing</li>
        <li>Stay in time with the music (within 1-2 beats)</li>
        <li>Identify and sing the correct solfege syllable for each note</li>
        <li>Complete entire hymns without getting lost</li>
      </ul>
      <p><strong>Progression:</strong> Once you can import and practice with multiple hymns, you have a complete toolkit for traditional FA SO LA practice! Build your collection of hymn MIDI files and practice regularly. This will significantly improve your ear training, part independence, and ability to sight-read using solfege!</p>
    </div>
  `;
}

function renderBenchmarkTracking() {
  return `
    <section class="benchmark-tracking">
      <h2>Benchmark Tracking</h2>
      <p>Since the app doesn't have built-in scoring, you'll need to track your progress yourself. Here are some methods:</p>
      
      <h3>Practice Log Template</h3>
      <div class="practice-log-template">
        <p>Keep a simple log like this:</p>
        <pre>
Date: ___________
Sub-lesson: ___________
Exercise: ___________
Score: ___/___
Notes: ___________
        </pre>
      </div>

      <h3>Self-Assessment Tips</h3>
      <ul>
        <li>Be honest with yourself - if you're guessing, you're not ready to move on</li>
        <li>If you achieve 8/10 or better consistently, you're ready for the next sub-lesson</li>
        <li>If you're struggling (5/10 or less), review the previous sub-lessons</li>
        <li>Don't rush - mastery takes time</li>
      </ul>

      <h3>When to Move On</h3>
      <ul>
        <li>You've achieved the benchmark (or close: 8/10+)</li>
        <li>You feel confident with the material</li>
        <li>You can complete exercises without constant reference to instructions</li>
      </ul>
    </section>
  `;
}

