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
        Welcome to the comprehensive learning path for solfege and shape notes! 
        This curriculum will guide you from complete beginner to singing harmony parts, 
        using the exercises in this application. Each lesson includes detailed, step-by-step 
        instructions for using the app's features.
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
      ${renderBenchmarkTracking()}
    </div>
  `;

  // Setup lesson collapse/expand functionality
  setupLessonCollapse();
}


function setupLessonCollapse() {
  // Load saved expanded state
  const savedExpanded = loadExpandedLessons();
  
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
    const saved = localStorage.getItem('theory-expanded-lessons');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load expanded lessons state:', e);
  }
  return { lessons: [], subLessons: [] };
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
    
    localStorage.setItem('theory-expanded-lessons', JSON.stringify({
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
        <h2>Lesson 1: Basics</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="1">
        <p class="lesson-goal"><strong>Goal:</strong> Master shape note recognition and basic solfege understanding</p>

        ${renderSubLesson('1.1', 'Shape Notes and Solfege Syllables', getSubLesson1_1())}
        ${renderSubLesson('1.2', 'Understanding the Staff Structure', getSubLesson1_2())}
        ${renderSubLesson('1.3', 'Movable Do System', getSubLesson1_3())}
        ${renderSubLesson('1.4', 'Basic Intervals (Whole Steps and Half Steps)', getSubLesson1_4())}
        ${renderSubLesson('1.5', 'Key Signatures and Accidentals', getSubLesson1_5())}
      </div>
    </section>
  `;
}

function renderLesson2() {
  return `
    <section class="lesson" id="lesson-2" data-lesson="2">
      <div class="lesson-header" data-lesson-toggle="2">
        <h2>Lesson 2: Ear Training</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="2">
        <p class="lesson-goal"><strong>Goal:</strong> Develop the ability to recognize intervals and pitches by ear</p>

        ${renderSubLesson('2.0', 'Finding Your Comfortable Do', getSubLesson2_0())}
        ${renderSubLesson('2.1', 'Visual and Audio Pitch Matching', getSubLesson2_1())}
        ${renderSubLesson('2.2', 'Interval Recognition (2nds, 3rds, 4ths, 5ths)', getSubLesson2_2())}
        ${renderSubLesson('2.3', 'Larger Intervals (6ths, 7ths, Octaves)', getSubLesson2_3())}
        ${renderSubLesson('2.4', 'Identifying Multiple Tones (Clusters)', getSubLesson2_4())}
      </div>
    </section>
  `;
}

function renderLesson3() {
  return `
    <section class="lesson" id="lesson-3" data-lesson="3">
      <div class="lesson-header" data-lesson-toggle="3">
        <h2>Lesson 3: Harmony</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="3">
        <p class="lesson-goal"><strong>Goal:</strong> Understand and sing in 4-part harmony (SATB)</p>

        ${renderSubLesson('3.1', 'Understanding SATB Structure', getSubLesson3_1())}
        ${renderSubLesson('3.2', 'Finding Your Part in Harmony', getSubLesson3_2())}
        ${renderSubLesson('3.3', 'Voice Leading and Part Independence', getSubLesson3_3())}
        ${renderSubLesson('3.4', 'Singing Against Other Parts', getSubLesson3_4())}
      </div>
    </section>
  `;
}

function renderLesson4() {
  return `
    <section class="lesson" id="lesson-4" data-lesson="4">
      <div class="lesson-header" data-lesson-toggle="4">
        <h2>Lesson 4: Chords</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="4">
        <p class="lesson-goal"><strong>Goal:</strong> Understand chord structure, qualities, and progressions using shape notes</p>

        ${renderSubLesson('4.1', 'Triads and Chord Qualities (Shape Note Focus)', getSubLesson4_1())}
        ${renderSubLesson('4.2', 'Chord Progressions (I, IV, V)', getSubLesson4_2())}
        ${renderSubLesson('4.3', 'Minor Chords and Other Qualities', getSubLesson4_3())}
        ${renderSubLesson('4.4', 'Advanced Harmony and Voice Leading', getSubLesson4_4())}
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
        <li><strong>Navigate to Flashcards Tab:</strong>
          <ul>
            <li>Look at the top navigation bar with tabs</li>
            <li>Click the <strong>"Flashcards"</strong> tab button (or use the "Tab" dropdown in the header)</li>
            <li>The Flashcards panel will appear below the staff</li>
          </ul>
        </li>
        <li><strong>Configure Flashcard Settings:</strong>
          <ul>
            <li>In the Flashcards panel, find the <strong>"Mode"</strong> dropdown</li>
            <li>Select <strong>"Shape → Solfege"</strong> (this should be the default)</li>
          </ul>
        </li>
        <li><strong>Practice with Flashcards:</strong>
          <ul>
            <li>Click the <strong>"Next"</strong> button (or press <strong>N</strong> on your keyboard)</li>
            <li>A shape note will appear in the large flashcard box</li>
            <li>Look at the shape and try to identify which solfege syllable it represents</li>
            <li>Click the <strong>"Flip"</strong> button (or press <strong>Spacebar</strong>) to reveal the answer</li>
            <li>The shape will be replaced with the solfege syllable text (e.g., "Do", "Re", "Mi")</li>
            <li>If correct, click <strong>"Next"</strong> to continue; if wrong, study the shape-syllable relationship</li>
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
        <li>The "Flip" button replaces the shape with text (not adds to it)</li>
        <li>The badge at the bottom shows "Ready" when waiting for next card</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If "Flip" adds text instead of replacing, that's a bug - refresh the page</li>
        <li>If you're struggling, slow down and study each shape-syllable pair</li>
        <li>Remember: Do (diamond), Re (oval), Mi (rectangle), Fa (triangle), So (oval), La (diamond), Ti (rectangle)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 20/20 correct on flashcards (no accidentals) in under 2 minutes</p>
      <p><strong>Progression:</strong> Move to 1.2 when benchmark achieved</p>
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
            <li>Look at the large canvas above the tabs - this is the <strong>staff</strong></li>
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
        <li><strong>Navigate to Warmup Tab to See Notes:</strong>
          <ul>
            <li>Click the <strong>"Warmup"</strong> tab</li>
            <li>Check <strong>"Major scale ↑"</strong></li>
            <li>Click <strong>"Play Warm Up"</strong> to see shape notes appear on the staff</li>
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
            <li>In the header controls, find the <strong>"Zoom"</strong> slider</li>
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
        <li>If staff is too small to see details, use the Zoom slider</li>
        <li>If you can't see the staff, make sure you're on a tab that displays music (Warmup, SATB, etc.)</li>
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
            <li>Look at the header controls (top of page)</li>
            <li>Find the control group labeled <strong>"Do"</strong></li>
            <li>There's a dropdown menu and a <strong>"Play Do"</strong> button</li>
          </ul>
        </li>
        <li><strong>Change the Do Note:</strong>
          <ul>
            <li>Click the <strong>"Do"</strong> dropdown menu</li>
            <li>You'll see a list of notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)</li>
            <li>Select a different note (e.g., if it's C, change it to <strong>G</strong>)</li>
            <li>Click the <strong>"Play Do"</strong> button to hear the new Do pitch</li>
          </ul>
        </li>
        <li><strong>Select Your Voice (Instrument):</strong>
          <ul>
            <li>In the header controls, find the <strong>"Voice"</strong> dropdown menu</li>
            <li>This controls what instrument sound is used for playback</li>
            <li>You have 4 options:
              <ul>
                <li><strong>Sine Wave</strong> (default) - A pure, simple tone with no harmonics. Best for learning pitch relationships clearly.</li>
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
        <li><strong>Observe Shape Consistency:</strong>
          <ul>
            <li>Navigate to the <strong>"Flashcards"</strong> tab</li>
            <li>Click <strong>"Next"</strong> to see a shape note</li>
            <li>Notice: The shapes themselves don't change!</li>
            <li>A diamond is still Do, an oval is still Re, etc.</li>
            <li>Only the actual pitch (frequency) changes</li>
          </ul>
        </li>
        <li><strong>Practice with Different Do Settings:</strong>
          <ul>
            <li>Go back to header, change Do to <strong>F</strong></li>
            <li>Click <strong>"Play Do"</strong> to hear it</li>
            <li>Go to <strong>"Flashcards"</strong> tab, practice identifying shapes</li>
            <li>Change Do to <strong>D</strong>, repeat</li>
            <li>The shapes should always mean the same thing (Do, Re, Mi, etc.)</li>
          </ul>
        </li>
        <li><strong>Use Warmup Tab to Hear Scales:</strong>
          <ul>
            <li>Click the <strong>"Warmup"</strong> tab</li>
            <li>In the "Select stanzas to play" section:
              <ul>
                <li>Check <strong>"Major scale ↑"</strong> (should be checked by default)</li>
                <li>Uncheck other stanzas for now</li>
              </ul>
            </li>
            <li>Click the <strong>"Play Warm Up"</strong> button</li>
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
        <li>If warmup doesn't play, make sure at least one stanza is checked</li>
        <li>If Piano or Choir sounds don't play immediately, wait a moment - they need to load samples first</li>
        <li>If you want the clearest pitch reference, use Sine Wave</li>
        <li>If you want to practice with a more realistic sound, use Piano or Choir</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully identify shapes correctly when Do is changed to 3 different keys (test with C, G, and F)</p>
      <p><strong>Progression:</strong> Move to 1.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson1_4() {
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
        <li><strong>Practice with Warmup Tab - Scales:</strong>
          <ul>
            <li>Click the <strong>"Warmup"</strong> tab</li>
            <li>In "Select stanzas to play":
              <ul>
                <li>Check <strong>"Major scale ↑"</strong></li>
                <li>Check <strong>"Major scale ↓"</strong></li>
                <li>Uncheck the others for now</li>
              </ul>
            </li>
            <li>Set <strong>Tempo</strong> slider to <strong>60 BPM</strong> (or slower if needed - drag left)</li>
            <li>Click <strong>"Play Warm Up"</strong></li>
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
        <li><strong>Practice with Interval Training Tab:</strong>
          <ul>
            <li>Click the <strong>"Interval Training"</strong> tab</li>
            <li>Find the difficulty buttons at the top</li>
            <li>Click the <strong>"Easy"</strong> button (it should highlight/activate)</li>
            <li>Find the <strong>"Direction"</strong> dropdown - set it to <strong>"Up"</strong></li>
            <li>Find <strong>"Min (semitones)"</strong> - set it to <strong>1</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set it to <strong>2</strong></li>
            <li>Make sure <strong>"Constrain to scale notes (diatonic)"</strong> checkbox is <strong>CHECKED</strong></li>
            <li>Make sure <strong>"Hide staff answers (until Reveal)"</strong> checkbox is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Click the <strong>"Play Interval"</strong> button</li>
            <li>You'll hear two notes played in sequence:
              <ul>
                <li>First note (A) plays for 1.2 seconds</li>
                <li>Second note (B) plays after a short pause</li>
              </ul>
            </li>
            <li><strong>Listen carefully</strong> to the interval between them</li>
            <li>Try to identify: Is it a half step (1 semitone) or whole step (2 semitones)?</li>
            <li>After deciding, click the <strong>"Reveal"</strong> button (or the "Reveal" button in the header)</li>
            <li>The staff will show both notes with their solfege labels</li>
            <li>The badge will show the interval name (e.g., "Minor 2nd" for half step, "Major 2nd" for whole step)</li>
            <li>Check if you were correct</li>
          </ul>
        </li>
        <li><strong>Repeat and Track Progress:</strong>
          <ul>
            <li>Click <strong>"Play Interval"</strong> again for a new interval</li>
            <li>Continue practicing until you can consistently identify half steps vs. whole steps</li>
            <li>Keep track: aim for 10 correct in a row</li>
          </ul>
        </li>
        <li><strong>Use Visual Feedback:</strong>
          <ul>
            <li>When you click "Reveal", look at the staff</li>
            <li>The two notes are shown with their shape note symbols</li>
            <li>The interval is labeled (e.g., "Do → Re = Major 2nd")</li>
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
        <li>In the warmup, you can see and hear the pattern: W-W-H-W-W-W-H (whole-whole-half-whole-whole-whole-half)</li>
        <li>Interval Training shows the interval name when revealed</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If intervals are too fast, the warmup tempo can be slowed down (drag slider left)</li>
        <li>If you can't tell the difference, play the warmup scale more times</li>
        <li>If "Reveal" doesn't show answers, make sure "Hide staff answers" isn't preventing it</li>
        <li>If you're struggling, focus on just Mi→Fa and Ti→Do (the half steps) first</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify 10/10 intervals of 1-2 semitones on Easy mode</p>
      <p><strong>Progression:</strong> Move to 1.5 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson1_5() {
  return `
    <div class="learning-objectives">
      <h4>Learning Objectives:</h4>
      <ul>
        <li>Understand how key signatures affect note placement on the staff</li>
        <li>Learn what accidentals (sharps, flats, naturals) mean</li>
        <li>Understand why notes may appear with accidentals even when Do is set</li>
        <li>Learn to toggle accidentals display in the app</li>
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
        <li><strong>Observe and Practice with Accidentals on the Staff:</strong>
          <ul>
            <li>Set Do to <strong>G#</strong> (or another sharp key) using the Do dropdown in the header</li>
            <li>Go to the <strong>"Warmup"</strong> tab</li>
            <li>In the header controls, find the <strong>"Show accidentals"</strong> checkbox (in the control ribbon - you may need to click "Show controls" if hidden)</li>
            <li>Make sure <strong>"Show accidentals"</strong> is checked (it's checked by default)</li>
            <li>Check <strong>"Major scale ↑"</strong> and click <strong>"Play Warm Up"</strong></li>
            <li>Watch the staff as the scale plays - you'll see accidentals (♯, ♭, or ♮) appearing before some notes</li>
            <li>These accidentals show how the note is spelled in that key</li>
            <li>Notice that some notes may have accidentals - this is normal and correct</li>
            <li><strong>Practice toggling accidentals:</strong>
              <ul>
                <li>Try <strong>unchecking</strong> "Show accidentals" in the header</li>
                <li>Play the warmup again - notice how accidentals disappear from the staff</li>
                <li>Try <strong>checking</strong> it again - accidentals will reappear</li>
                <li>This is useful if you find accidentals distracting, or if you want to see them for learning</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Compare Different Keys:</strong>
          <ul>
            <li>Set Do to <strong>C</strong> (no sharps/flats)</li>
            <li>Play the warmup scale - notice there are no accidentals (C major has no sharps/flats)</li>
            <li>Set Do to <strong>G</strong> (one sharp)</li>
            <li>Play the warmup scale - you may see some accidentals</li>
            <li>Set Do to <strong>F</strong> (one flat)</li>
            <li>Play the warmup scale - you may see different accidentals (flats instead of sharps)</li>
            <li>This demonstrates how different keys require different accidentals</li>
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
        <li>Accidentals appear to the left of note heads (♯ for sharp, ♭ for flat, ♮ for natural)</li>
        <li>Different keys show different accidentals</li>
        <li>When "Show accidentals" is unchecked, notes still appear in correct positions, just without the symbols</li>
        <li>In sharp keys (G, D, A, E, B, F#, C#), you'll see sharps</li>
        <li>In flat keys (F, Bb, Eb, Ab, Db, Gb, Cb), you'll see flats</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you see accidentals that seem wrong, remember: the app uses key-aware spelling, which follows music theory rules</li>
        <li>If accidentals are distracting, uncheck "Show accidentals" - the notes will still be in correct positions</li>
        <li>If you can't find the "Show accidentals" checkbox, make sure the header controls are visible (click "Show controls" if needed)</li>
        <li>If notes look like they're in wrong positions, that's likely due to key-aware placement - this is correct behavior</li>
        <li>Remember: accidentals don't change the pitch, they just show how the note is spelled in the current key</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Understand why accidentals appear in different keys, and be able to toggle the accidentals display on/off</p>
      <p><strong>Progression:</strong> Move to Lesson 2 when benchmark achieved</p>
    </div>
  `;
}

// Continue with Lesson 2 sub-lessons...
function getSubLesson2_0() {
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
            <li>In the header controls, find the <strong>"Do"</strong> dropdown menu</li>
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
            <li>In the header controls, find the <strong>"Do"</strong> control group</li>
            <li>There's a <strong>"Do"</strong> dropdown menu and a <strong>"Play Do"</strong> button</li>
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
            <li>Go to the <strong>"Warmup"</strong> tab</li>
            <li>Check <strong>"Major scale ↑"</strong> and click <strong>"Play Warm Up"</strong></li>
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
            <li>If any notes are uncomfortable, go back to the header and adjust Do, then test again</li>
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
      <p><strong>Progression:</strong> Move to 2.1 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson2_1() {
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
            <li>In the header controls, find the <strong>"Start Mic"</strong> button</li>
            <li>Click <strong>"Start Mic"</strong> (you may need to allow browser microphone access)</li>
            <li>The button will change to <strong>"Stop Mic"</strong> when active</li>
            <li>You should see your pitch appear on the staff as a line as you sing</li>
            <li>In the header, you'll see <strong>"Mic: [frequency] Hz | Δ [cents] cents"</strong> showing your current pitch</li>
          </ul>
        </li>
        <li><strong>Observe the Staff with Warmup - Visual Distance:</strong>
          <ul>
            <li>Click the <strong>"Warmup"</strong> tab</li>
            <li>Check only <strong>"Major scale ↑"</strong></li>
            <li>Click <strong>"Play Warm Up"</strong> (you don't need to sing yet - just watch)</li>
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
            <li><strong>Play the warmup again</strong> and watch the red play line move up the staff as the scale ascends</li>
          </ul>
        </li>
        <li><strong>Practice Singing and Observing Visual Position:</strong>
          <ul>
            <li>With the warmup still playing, <strong>sing the solfege syllables</strong> as the scale plays:
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
            <li>In the header controls, find the <strong>"Do"</strong> control group</li>
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
            <li>Go back to the <strong>"Warmup"</strong> tab</li>
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
        <li>If your voice line doesn't appear on staff, make sure "Start Mic" was clicked</li>
        <li>If your line is always way above/below, you might be singing an octave too high/low - try adjusting your Do setting</li>
        <li>If you can't see the visual distance clearly, use the Zoom slider in the header to make the staff larger</li>
        <li>If the staff is cluttered, clear it by switching tabs or refreshing</li>
        <li>If you're confused about which direction is "up", remember: higher pitch = higher on the staff (like a ladder)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing a major scale (Do through Do) while observing that your voice line moves progressively higher on the staff, aligning with each target note within ±50 cents</p>
      <p><strong>Progression:</strong> Move to 2.2 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson2_2() {
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
        <li><strong>Review Intervals with Warmup:</strong>
          <ul>
            <li>Click <strong>"Warmup"</strong> tab</li>
            <li>Check <strong>"Intervals from Do ↑"</strong></li>
            <li>Uncheck other stanzas</li>
            <li>Click <strong>"Play Warm Up"</strong></li>
            <li>Listen to each interval: Do→Re (2nd), Do→Mi (3rd), Do→Fa (4th), Do→So (5th), etc.</li>
            <li><strong>Repeat 3-5 times</strong> to familiarize yourself with each interval's "feel"</li>
          </ul>
        </li>
        <li><strong>Configure Interval Training Tab:</strong>
          <ul>
            <li>Click <strong>"Interval Training"</strong> tab</li>
            <li>Click the <strong>"Easy"</strong> difficulty button (should highlight)</li>
            <li>Find <strong>"Direction"</strong> dropdown - set to <strong>"Up"</strong> (ascending only for now)</li>
            <li>Find <strong>"Min (semitones)"</strong> - set to <strong>2</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set to <strong>7</strong> (this covers 2nd through 5th)</li>
            <li>Make sure <strong>"Constrain to scale notes (diatonic)"</strong> is <strong>CHECKED</strong></li>
            <li>Make sure <strong>"Hide staff answers (until Reveal)"</strong> is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Click <strong>"Play Interval"</strong> button</li>
            <li>Listen to the two notes (A then B)</li>
            <li><strong>Try to identify the interval</strong>:
              <ul>
                <li>Is it small (2nd or 3rd)?</li>
                <li>Is it medium (4th or 5th)?</li>
                <li>Try to name it: "That's a 3rd" or "That's a 5th"</li>
              </ul>
            </li>
            <li>After deciding, click <strong>"Reveal"</strong> button (in the tab or header)</li>
            <li>Check the staff - it shows both notes with solfege labels</li>
            <li>Check the badge - it shows the interval name (e.g., "Major 3rd", "Perfect 4th")</li>
            <li><strong>Were you correct?</strong> If yes, great! If no, study the interval</li>
          </ul>
        </li>
        <li><strong>Study the Visual Feedback:</strong>
          <ul>
            <li>When revealed, look at the staff</li>
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
                <li>Reveal</li>
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
            <li>The staff will confirm your solfege guess when revealed</li>
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
            <li>In the <strong>"Interval Training"</strong> tab, change the <strong>"Direction"</strong> dropdown to <strong>"Down"</strong></li>
            <li>Keep the same settings: Min 2, Max 7, diatonic checked</li>
            <li>Click <strong>"Play Interval"</strong></li>
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
            <li>For each one: Listen → Identify the interval size → Reveal → Check</li>
            <li>Aim for 10/10 correct on descending before moving on</li>
            <li>If struggling, use the warmup <strong>"Intervals from Do ↓"</strong> to hear descending examples</li>
          </ul>
        </li>
        <li><strong>Mix Ascending and Descending:</strong>
          <ul>
            <li>Once comfortable with both, change <strong>"Direction"</strong> to <strong>"Either"</strong></li>
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
        <li>The staff shows the exact interval when revealed</li>
        <li>The badge shows the technical name (Major 2nd, Minor 3rd, etc.)</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If all intervals sound the same, play the warmup "Intervals from Do" more times</li>
        <li>If you're guessing randomly, slow down and really listen to each interval</li>
        <li>If you're confusing 2nds and 3rds, focus on those two first</li>
        <li>If you're confusing 4ths and 5ths, practice those specifically</li>
        <li>Use the warmup to hear "pure" examples before testing yourself</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on Interval Training with intervals 2-7 semitones in EACH direction:</p>
      <ul>
        <li>10/10 with Direction: Up (ascending)</li>
        <li>10/10 with Direction: Down (descending)</li>
        <li>10/10 with Direction: Either (mixed)</li>
      </ul>
      <p><strong>Progression:</strong> Move to 2.3 when all three benchmarks achieved</p>
    </div>
  `;
}

function getSubLesson2_3() {
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
        <li><strong>Configure Interval Training for Larger Intervals:</strong>
          <ul>
            <li>Click <strong>"Interval Training"</strong> tab</li>
            <li>Click the <strong>"Medium"</strong> difficulty button (upgrade from Easy)</li>
            <li>Find <strong>"Direction"</strong> dropdown - keep it on <strong>"Either"</strong> (you mastered this in 2.2)</li>
            <li>Find <strong>"Min (semitones)"</strong> - set to <strong>1</strong></li>
            <li>Find <strong>"Max (semitones)"</strong> - set to <strong>12</strong> (this includes octaves)</li>
            <li>Make sure <strong>"Constrain to scale notes (diatonic)"</strong> is <strong>CHECKED</strong></li>
            <li>Make sure <strong>"Hide staff answers (until Reveal)"</strong> is <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Practice with Warmup First</strong> (optional review):
          <ul>
            <li>Click <strong>"Warmup"</strong> tab</li>
            <li>Check <strong>"Intervals from Do ↑"</strong> and <strong>"Intervals from Do ↓"</strong></li>
            <li>Play warmup to hear larger intervals (6th, 7th, octave)</li>
            <li>Listen for the "feel" of these larger intervals</li>
          </ul>
        </li>
        <li><strong>Practice Interval Identification:</strong>
          <ul>
            <li>Go back to <strong>"Interval Training"</strong> tab</li>
            <li>Click <strong>"Play Interval"</strong></li>
            <li>Remember: intervals can go up or down (you practiced this in 2.2)</li>
            <li>Now focus on identifying the <strong>larger intervals</strong>: 6th, 7th, octave</li>
            <li>Click <strong>"Reveal"</strong> to check</li>
            <li>Study the staff and badge for feedback</li>
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
        <li>You should already be comfortable with ascending vs. descending from Lesson 2.2</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you're confusing 6ths and 7ths, practice those two specifically</li>
        <li>If octaves are hard, practice Do→Do (octave) vs. Do→Ti (7th) to feel the difference</li>
        <li>If direction (ascending/descending) is still confusing, review Lesson 2.2</li>
        <li>If starting from different notes is hard, that's normal - keep practicing</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on Interval Training Medium mode (intervals 1-12 semitones, direction either)</p>
      <p><strong>Progression:</strong> Move to 2.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson2_4() {
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
        <li><strong>Configure Hidden Cluster Tab:</strong>
          <ul>
            <li>Click the <strong>"Hidden Cluster"</strong> tab</li>
            <li>Find the difficulty buttons at the top</li>
            <li>Click the <strong>"Easy"</strong> button (start here)</li>
            <li>Find the <strong>"Constrain to scale notes (diatonic)"</strong> checkbox - make sure it's <strong>CHECKED</strong></li>
            <li>Find the <strong>"Duration"</strong> slider - set it to <strong>3 seconds</strong> (or higher if you need more time)</li>
            <li>The slider shows "Duration: [X] seconds" - adjust as needed</li>
            <li>Find <strong>"Hide staff answers (until Reveal)"</strong> checkbox - make sure it's <strong>CHECKED</strong></li>
          </ul>
        </li>
        <li><strong>Start with 2 Tones:</strong>
          <ul>
            <li>Click the <strong>"Play 2"</strong> button</li>
            <li>You'll hear 2 notes playing simultaneously (at the same time)</li>
            <li>They'll play for the duration you set (3+ seconds)</li>
            <li><strong>Listen carefully</strong> - try to identify each individual tone</li>
            <li>Hum or sing each tone you hear</li>
            <li>Try to name them in solfege (e.g., "I hear Do and Mi")</li>
          </ul>
        </li>
        <li><strong>Reveal and Check:</strong>
          <ul>
            <li>After listening and trying to identify the tones, click <strong>"Reveal"</strong> button</li>
            <li>The staff will show the 2 notes with their solfege labels</li>
            <li>Check if you identified them correctly</li>
            <li>The badge will show something like "Do, Mi" or "Re, So"</li>
          </ul>
        </li>
        <li><strong>Practice Systematically:</strong>
          <ul>
            <li>Click <strong>"Play 2"</strong> again for a new cluster</li>
            <li>Listen, identify, then reveal</li>
            <li>Repeat 10 times</li>
            <li>Track your score: aim for 10/10 correct</li>
          </ul>
        </li>
        <li><strong>Move to Medium Difficulty:</strong>
          <ul>
            <li>Once you can identify 2 tones consistently on Easy, click <strong>"Medium"</strong> difficulty button</li>
            <li>Medium still uses 2 tones but they might be further apart in pitch</li>
            <li>Practice with <strong>"Play 2"</strong> on Medium mode</li>
            <li>Aim for 10/10 correct on Medium</li>
          </ul>
        </li>
        <li><strong>Try 3 Tones</strong> (when ready):
          <ul>
            <li>After mastering 2 tones, try <strong>"Play 3"</strong> button</li>
            <li>This plays 3 simultaneous notes - more challenging!</li>
            <li>Start on <strong>"Easy"</strong> mode with 3 tones</li>
            <li>Listen for each individual tone</li>
            <li>Try to identify all 3 in solfege</li>
            <li>Reveal to check</li>
          </ul>
        </li>
        <li><strong>Use Duration Slider:</strong>
          <ul>
            <li>If 3 seconds isn't enough time, increase the <strong>"Duration"</strong> slider</li>
            <li>Drag it to <strong>5 seconds</strong> or <strong>7 seconds</strong> if needed</li>
            <li>More time = easier to identify tones</li>
            <li>As you improve, decrease the duration for more challenge</li>
          </ul>
        </li>
      </ol>
    </div>

    <div class="what-to-look-for">
      <h4>What to Look For:</h4>
      <ul>
        <li>Easy mode: Always includes Do + one other note, both diatonic (in the scale)</li>
        <li>Medium mode: Includes Do + other notes, might go up or down from Do</li>
        <li>When revealed, the staff shows all tones with their shape notes and solfege labels</li>
        <li>The tones are sorted from lowest to highest on the staff</li>
        <li>Try to "pick out" each tone individually from the cluster</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear individual tones, increase the Duration slider (more time)</li>
        <li>If all tones sound the same, you might be hearing the chord as a whole - try to focus on one tone at a time</li>
        <li>If you're only hearing one tone, listen more carefully - there are definitely 2 (or 3) tones</li>
        <li>If Easy is too hard, that's okay - keep practicing, your ear will improve</li>
        <li>Try humming along with one tone, then switch to the other tone(s)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> 10/10 correct on Hidden Cluster Medium mode (2 tones)</p>
      <p><strong>Progression:</strong> Move to Lesson 3 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 3 sub-lessons
function getSubLesson3_1() {
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
        <li><strong>Navigate to SATB Practice Tab:</strong>
          <ul>
            <li>Click the <strong>"SATB Practice"</strong> tab</li>
            <li>You'll see controls for exercise selection, part volumes, tempo, etc.</li>
          </ul>
        </li>
        <li><strong>Select an Exercise:</strong>
          <ul>
            <li>Find the <strong>"Exercise"</strong> dropdown menu at the top</li>
            <li>Click it to see available exercises</li>
            <li>Select the first exercise (or any simple one)</li>
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
        <li><strong>Use Part Volume Controls to Isolate Parts:</strong>
          <ul>
            <li>Scroll down in the SATB panel to find <strong>"Part Volumes"</strong> section</li>
            <li>You'll see 4 volume sliders: <strong>Soprano, Alto, Tenor, Bass</strong></li>
            <li><strong>Mute other parts:</strong> Drag Soprano, Alto, and Tenor sliders all the way to the <strong>left (0)</strong></li>
            <li>Leave Bass slider at a moderate level (middle)</li>
            <li>Now only Bass is audible</li>
          </ul>
        </li>
        <li><strong>Listen to Each Part Individually:</strong>
          <ul>
            <li><strong>Bass only:</strong> With only Bass audible, click <strong>"Play"</strong> button</li>
            <li>Listen to the Bass part - notice it's the lowest part</li>
            <li>Watch the staff - the red play line follows the Bass notes</li>
            <li>Stop playback (click <strong>"Stop"</strong>)</li>
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
            <li>Set all 4 volume sliders to the same level (middle position)</li>
            <li>Click <strong>"Play"</strong></li>
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
        <li>If you don't see 4 parts on the staff, make sure an exercise is selected</li>
        <li>If volume sliders don't work, make sure you're dragging them, not clicking</li>
        <li>If playback doesn't start, check that an exercise is loaded</li>
        <li>If parts sound the same, make sure you're muting/unmuting correctly</li>
        <li>If staff is cluttered, use the zoom slider in the header to adjust</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify which part (S/A/T/B) is singing when listening to isolated parts (test yourself: have someone else play a random part, or use a random number generator to pick which part to isolate)</p>
      <p><strong>Progression:</strong> Move to 3.2 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 3 remaining sub-lessons
function getSubLesson3_2() {
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
            <li>If you haven't already, complete <strong>Lesson 2.0 (Finding Your Comfortable Do)</strong> to determine your vocal range</li>
            <li>Based on your comfortable Do setting from that lesson, determine if you're more comfortable in the higher range (Soprano/Alto) or lower range (Tenor/Bass)</li>
            <li>Higher voices (comfortable with Do around D4, E4, F4): likely Soprano or Alto</li>
            <li>Lower voices (comfortable with Do around A3, Bb3, C4): likely Tenor or Bass</li>
          </ul>
        </li>
        <li><strong>Select Your Target Part:</strong>
          <ul>
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Find the <strong>"Aim For Part"</strong> section</li>
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
        <li><strong>Adjust Part Volumes:</strong>
          <ul>
            <li>Find <strong>"Part Volumes"</strong> section</li>
            <li><strong>Lower your part's volume slightly</strong>:
              <ul>
                <li>If aiming for Soprano, drag Soprano slider to about <strong>30-40%</strong> (not 0, but quieter)</li>
                <li>If aiming for Alto, drag Alto slider to 30-40%</li>
                <li>If aiming for Tenor, drag Tenor slider to 30-40%</li>
                <li>If aiming for Bass, drag Bass slider to 30-40%</li>
              </ul>
            </li>
            <li><strong>Keep other parts at normal volume</strong> (middle position, about 50-60%)</li>
            <li>This way you can hear your part but also hear the harmony, and you won't just "follow the recording"</li>
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
            <li>Click <strong>"Play"</strong> button</li>
            <li><strong>As the music plays, sing along with your target part</strong></li>
            <li>Watch the staff - the red play line shows where you are</li>
            <li>Watch your target part's notes - try to match them</li>
            <li><strong>Use the microphone</strong> - your voice should appear on the staff</li>
            <li>Try to make your voice note align with your target part's notes</li>
          </ul>
        </li>
        <li><strong>Use Tempo Control</strong> (if needed):
          <ul>
            <li>If the music is too fast, find the <strong>"Tempo"</strong> slider</li>
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
        <li>If you can't hear your part, increase its volume slider slightly</li>
        <li>If you're just following the recording, lower your part's volume more (to 20-30%)</li>
        <li>If tempo is too fast, slow it down with the tempo slider</li>
        <li>If your voice doesn't appear on staff, make sure mic is started</li>
        <li>If you're singing wrong octave, try singing an octave higher or lower</li>
        <li>If you can't find your part, try a different part (maybe Alto instead of Soprano, etc.)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing your part for a complete SATB exercise with 80%+ pitch accuracy (your voice note aligns with target part notes on staff for most of the exercise)</p>
      <p><strong>Progression:</strong> Move to 3.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson3_3() {
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
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Select an exercise</li>
            <li>Find <strong>"Aim For Part"</strong> - select your part (S, A, T, or B)</li>
            <li>Find <strong>"Part Volumes"</strong> section</li>
          </ul>
        </li>
        <li><strong>Mute Your Part Completely:</strong>
          <ul>
            <li>Drag <strong>your part's volume slider all the way to the left (0)</strong> - completely mute it</li>
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
            <li>Click <strong>"Play"</strong></li>
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
            <li><strong>Unmute your part slightly</strong> (drag slider to 20-30%)</li>
            <li><strong>Play again</strong> and sing along</li>
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
        <li><strong>Use Hidden Cluster Tab for Extra Practice:</strong>
          <ul>
            <li>Go to <strong>"Hidden Cluster"</strong> tab</li>
            <li>Click <strong>"Hard"</strong> difficulty button</li>
            <li>Click <strong>"Play 3"</strong> or <strong>"Play 2"</strong></li>
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
      <p><strong>Progression:</strong> Move to 3.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson3_4() {
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
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Select an exercise</li>
            <li>Find <strong>"Aim For Part"</strong> - select your part</li>
            <li>Find <strong>"Part Volumes"</strong> section</li>
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
            <li>Find the <strong>"Tempo"</strong> slider</li>
            <li>Drag it to <strong>50 BPM</strong> or <strong>40 BPM</strong> (slower than default 60)</li>
            <li>Slower tempo = easier to maintain your part</li>
            <li>You can speed up later as you improve</li>
          </ul>
        </li>
        <li><strong>Play and Sing Your Part:</strong>
          <ul>
            <li>Make sure <strong>"Start Mic"</strong> is clicked (microphone is active)</li>
            <li>Click <strong>"Play"</strong> button</li>
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
                <li><strong>Lower your part's volume</strong> to 30-40% (make it quieter)</li>
                <li>This forces you to rely on memory/visual cues rather than just following the sound</li>
                <li>As you improve, gradually increase your part's volume back to 50%</li>
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
        <li><strong>Practice with Chord Quality Tab</strong> (optional):
          <ul>
            <li>Go to <strong>"Chord Quality"</strong> tab</li>
            <li>Click the <strong>"Do (I)"</strong> button for chord root</li>
            <li>Click the <strong>"Major (1-3-5)"</strong> button for chord quality</li>
            <li>Click <strong>"Start Drone"</strong> to hear the I chord (Do-Mi-So)</li>
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
        <li>If you keep singing other parts, lower your part's volume more (to 20-30%) to force independence</li>
        <li>If tempo is too fast, slow it down - there's no rush</li>
        <li>If you lose your place, watch the red play line on the staff</li>
        <li>If harmony sounds bad, you might be singing wrong notes - check the staff</li>
        <li>If you can't hear yourself, you might need to sing louder or adjust mic sensitivity</li>
        <li>If it's overwhelming, practice with just 2 parts first (mute 2 parts, keep 2 playing)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing your part through a complete SATB exercise with all parts playing at normal tempo (60 BPM), maintaining accurate pitch and rhythm throughout</p>
      <p><strong>Progression:</strong> Move to Lesson 4 when benchmark achieved</p>
    </div>
  `;
}

// Lesson 4 sub-lessons
function getSubLesson4_1() {
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
        <li><strong>Set Up Chord Quality Tab:</strong>
          <ul>
            <li>Click the <strong>"Chord Quality"</strong> tab</li>
            <li>You'll see buttons for chord root (Do, Re, Mi, Fa, Sol, La, Ti), chord quality (Major, Minor, etc.), and inversion (Root, 1st, 2nd)</li>
            <li>When you click any button, the chord will automatically preview for about 0.5 seconds so you can hear it</li>
          </ul>
        </li>
        <li><strong>Practice I Chord (Do-Mi-So):</strong>
          <ul>
            <li>Click the <strong>"Do (I)"</strong> button to select it as the chord root (it will highlight)</li>
            <li>Click the <strong>"Major (1-3-5)"</strong> button to select it as the chord quality</li>
            <li>This creates a I chord (tonic chord)</li>
            <li><strong>Notice</strong> - when you click a button, you'll hear a brief preview (~0.5 seconds) of the chord</li>
            <li><strong>Look at the staff</strong> - you'll see Do, Mi, So displayed with their shape notes</li>
            <li><strong>Study the shapes</strong>: Notice which shape is Do (diamond), Mi (rectangle), So (oval)</li>
            <li>Click <strong>"Start Drone"</strong> button to hear the chord continuously</li>
            <li>You'll hear all 3 notes playing simultaneously (a chord)</li>
            <li><strong>Watch the staff</strong> - the active tones (playing in the drone) will be highlighted brighter</li>
            <li><strong>Listen to the quality</strong> - this is a Major chord (sounds "happy" or "bright")</li>
            <li>Click <strong>"Stop Drone"</strong></li>
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
            <li>Use the microphone - your voice should align with each tone on the staff</li>
          </ul>
        </li>
        <li><strong>Practice V Chord (So-Ti-Re):</strong>
          <ul>
            <li>Click <strong>"Stop Drone"</strong> if it's still playing</li>
            <li>Click the <strong>"Sol (V)"</strong> button to select it as the chord root</li>
            <li>Keep <strong>"Major (1-3-5)"</strong> selected as the chord quality</li>
            <li>This creates a V chord (dominant chord)</li>
            <li><strong>Notice the preview</strong> - you'll hear the chord briefly when you click</li>
            <li>Look at the staff - see So, Ti, Re with their shape notes</li>
            <li><strong>Study the shapes</strong>: So (oval), Ti (rectangle), Re (oval)</li>
            <li>Click <strong>"Start Drone"</strong> to hear it continuously</li>
            <li><strong>Listen to the quality</strong> - this is also a Major chord</li>
            <li><strong>Try to identify each tone</strong>: So (lowest), Ti (middle), Re (highest)</li>
            <li><strong>Sing along with each tone</strong></li>
          </ul>
        </li>
        <li><strong>Practice IV Chord (Fa-La-Do):</strong>
          <ul>
            <li>Click <strong>"Stop Drone"</strong> if it's still playing</li>
            <li>Click the <strong>"Fa (IV)"</strong> button to select it as the chord root</li>
            <li>Keep <strong>"Major (1-3-5)"</strong> selected as the chord quality</li>
            <li>This creates a IV chord (subdominant chord)</li>
            <li><strong>Notice the preview</strong> - you'll hear the chord briefly when you click</li>
            <li>Look at the staff - see Fa, La, Do with their shape notes</li>
            <li><strong>Study the shapes</strong>: Fa (triangle), La (diamond), Do (diamond)</li>
            <li>Click <strong>"Start Drone"</strong> to hear it continuously</li>
            <li><strong>Listen to the quality</strong> - also a Major chord</li>
            <li><strong>Try to identify each tone</strong>: Fa (lowest), La (middle), Do (highest)</li>
            <li><strong>Sing along with each tone</strong></li>
          </ul>
        </li>
        <li><strong>Use Hidden Cluster Tab for Practice:</strong>
          <ul>
            <li>Go to <strong>"Hidden Cluster"</strong> tab</li>
            <li>Click <strong>"Medium"</strong> difficulty button</li>
            <li>Click <strong>"Play 3"</strong> button</li>
            <li>You'll hear 3 tones simultaneously (like a chord)</li>
            <li><strong>Try to identify each tone</strong> in solfege</li>
            <li>Click <strong>"Reveal"</strong> to check</li>
            <li>This practices hearing individual tones in a chord</li>
          </ul>
        </li>
        <li><strong>Compare Chord Qualities:</strong>
          <ul>
            <li>Go back to <strong>"Chord Quality"</strong> tab</li>
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
        <li>I chord = Do-Mi-So (diamond, rectangle, oval shapes)</li>
        <li>V chord = So-Ti-Re (oval, rectangle, oval shapes)</li>
        <li>IV chord = Fa-La-Do (triangle, diamond, diamond shapes)</li>
        <li>All three are Major chords (same quality, different roots)</li>
        <li>Each chord has 3 distinct tones you can identify</li>
        <li>Shape notes help you see which solfege syllables are in each chord</li>
      </ul>
    </div>

    <div class="troubleshooting">
      <h4>Troubleshooting:</h4>
      <ul>
        <li>If you can't hear individual tones, try using the Warmup tab's arpeggios to hear each chord tone one at a time</li>
        <li>If chords all sound the same, listen more carefully - they have different "feels"</li>
        <li>If you can't identify tones in a cluster, practice with Hidden Cluster tab more</li>
        <li>If shapes are confusing, study them one at a time (just I chord first, then add others)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify all 3 tones in I, IV, and V chords 8/10 times (when you hear a chord, you can name all 3 solfege syllables)</p>
      <p><strong>Progression:</strong> Move to 4.2 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson4_2() {
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
        <li><strong>Set Up Chord Quality Tab:</strong>
          <ul>
            <li>Go to <strong>"Chord Quality"</strong> tab</li>
            <li>You'll see buttons for chord root (Do, Re, Mi, Fa, Sol, La, Ti) and chord quality (Major, Minor, etc.)</li>
            <li>When you click any button, the chord will automatically preview for about 0.5 seconds</li>
            <li>The chord tones will automatically display on the staff when you select a root and quality</li>
          </ul>
        </li>
        <li><strong>Practice I → IV → V → I Progression:</strong>
          <ul>
            <li><strong>Step 1 - I Chord</strong>:
              <ul>
                <li>Click the <strong>"Do (I)"</strong> button to select it as the chord root</li>
                <li>Click the <strong>"Major (1-3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - each button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed with shape notes</li>
                <li>Click <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this is "home" (tonic)</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 2 - IV Chord</strong>:
              <ul>
                <li>Click the <strong>"Fa (IV)"</strong> button to select it as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Notice</strong> - clicking the root button will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show Fa, La, Do</li>
                <li>Click <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels "calm" or "subdominant"</li>
                <li><strong>Compare to I chord</strong> - how does it feel different?</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 3 - V Chord</strong>:
              <ul>
                <li>Click the <strong>"Sol (V)"</strong> button to select it as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Notice</strong> - clicking the root button will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show So, Ti, Re</li>
                <li>Click <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels "unresolved" or "wants to go somewhere" (dominant)</li>
                <li><strong>Compare to I and IV</strong> - how does it feel different?</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Step 4 - Back to I Chord</strong>:
              <ul>
                <li>Click the <strong>"Do (I)"</strong> button again to select it as the chord root</li>
                <li>Keep <strong>"Major (1-3-5)"</strong> selected (it should already be highlighted)</li>
                <li><strong>Notice</strong> - clicking the root button will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - the chord tones will update back to Do, Mi, So</li>
                <li>Click <strong>"Start Drone"</strong></li>
                <li>Listen for 3-4 seconds</li>
                <li><strong>Notice the "feel"</strong> - this feels like "resolution" or "coming home"</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Practice the Full Progression:</strong>
          <ul>
            <li><strong>Repeat the progression</strong> (I → IV → V → I) 5-10 times</li>
            <li>Use the buttons to quickly switch between chord roots (each click will preview the chord)</li>
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
        <li><strong>Practice with Warmup Arpeggios:</strong>
          <ul>
            <li>Go to <strong>"Warmup"</strong> tab</li>
            <li>Check the <strong>"Arpeggios (↑)"</strong> and/or <strong>"Arpeggios (↓)"</strong> checkboxes</li>
            <li>Uncheck other stanzas if you want to focus just on arpeggios</li>
            <li>Click <strong>"Play Warm Up"</strong></li>
            <li><strong>Watch the staff</strong> as the arpeggios play</li>
            <li>You'll see I, IV, and V chord arpeggios play sequentially</li>
            <li>Each arpeggio shows the shape notes for that chord (Do-Mi-So for I, Fa-La-Do for IV, So-Ti-Re for V)</li>
            <li>This visual practice helps you see which shape notes belong to each chord in the progression</li>
            <li>Listen to how each chord feels different as the arpeggios play</li>
          </ul>
        </li>
        <li><strong>Practice with SATB Tab:</strong>
          <ul>
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Select an exercise</li>
            <li><strong>Play the exercise</strong> and listen</li>
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
            <li>Have someone else (or alternate yourself) play a progression using the buttons</li>
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
        <li>If SATB is too complex, stick with Chord Quality tab for now</li>
        <li>If you're confused, focus on just I and V first (I → V → I is simpler)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Correctly identify I, IV, and V chords in a progression 8/10 times (when you hear a chord change, you can name which chord it is)</p>
      <p><strong>Progression:</strong> Move to 4.3 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson4_3() {
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
            <li>Go to <strong>"Chord Quality"</strong> tab</li>
            <li><strong>Major I chord</strong>: 
              <ul>
                <li>Click the <strong>"Do (I)"</strong> button to select it as the chord root</li>
                <li>Click the <strong>"Major (1-3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - each button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed with shape notes</li>
                <li>Click <strong>"Start Drone"</strong>, listen for 3-4 seconds</li>
                <li><strong>Notice the quality</strong> - "bright" or "happy"</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Minor i chord</strong>:
              <ul>
                <li>Keep <strong>"Do (I)"</strong> selected as the chord root</li>
                <li>Click the <strong>"Minor (1-♭3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - the button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - the chord tones will update to show Do, Me, So (Me = lowered Mi)</li>
                <li>Notice how the shape note for the 3rd changes (Mi becomes Me with an accidental)</li>
                <li>Click <strong>"Start Drone"</strong>, listen for 3-4 seconds</li>
                <li><strong>Notice the quality</strong> - "darker" or "sadder" than Major</li>
                <li><strong>Compare</strong>: Major sounds "bright", minor sounds "dark"</li>
                <li>Click <strong>"Stop Drone"</strong></li>
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
                <li>Click the <strong>"Fa (IV)"</strong> button to select it as the chord root</li>
                <li>Click the <strong>"Minor (1-♭3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - each button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - you'll see Fa, La♭, Do (La lowered to La♭)</li>
                <li>Notice how the shape note for La changes (with an accidental)</li>
                <li>Click <strong>"Start Drone"</strong>, listen to the quality - "darker" than Major IV</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Minor v chord</strong>:
              <ul>
                <li>Click the <strong>"Sol (V)"</strong> button to select it as the chord root</li>
                <li>Click the <strong>"Minor (1-♭3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - each button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - you'll see So, Ti♭, Re (Ti lowered to Ti♭)</li>
                <li>Notice how the shape note for Ti changes (with an accidental)</li>
                <li>Click <strong>"Start Drone"</strong>, listen to the quality - "darker" than Major V</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Use Chord Quality Buttons:</strong>
          <ul>
            <li>In <strong>"Chord Quality"</strong> tab, use the <strong>"Chord quality"</strong> buttons</li>
            <li>Click <strong>"Major (1-3-5)"</strong> - you'll hear a brief preview of the bright quality</li>
            <li>Click <strong>"Minor (1-♭3-5)"</strong> - you'll hear a brief preview of the dark quality</li>
            <li><strong>Watch the staff</strong> - you'll see the chord tones update and the shape notes change</li>
            <li><strong>Practice switching</strong> between Major and minor for the same root</li>
            <li>Each button click will automatically preview the chord for ~0.5 seconds</li>
            <li>Really listen to the difference and watch how the shape notes reflect the change</li>
          </ul>
        </li>
        <li><strong>Practice with Warmup Arpeggios:</strong>
          <ul>
            <li>Go to <strong>"Warmup"</strong> tab</li>
            <li>Check the <strong>"Arpeggios (↑)"</strong> and/or <strong>"Arpeggios (↓)"</strong> checkboxes</li>
            <li>Click <strong>"Play Warm Up"</strong></li>
            <li><strong>Watch the staff</strong> as the arpeggios play</li>
            <li>Notice how Major chord arpeggios (I, IV, V) have different shape notes than minor chord arpeggios (ii, iii, vi)</li>
            <li>This visual practice helps you see the shape note differences between Major and minor chords</li>
            <li>Listen to the quality difference as each arpeggio plays</li>
          </ul>
        </li>
        <li><strong>Practice with SATB Tab:</strong>
          <ul>
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Load an exercise that has minor chords</li>
            <li><strong>Play and listen</strong></li>
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
      <p><strong>Progression:</strong> Move to 4.4 when benchmark achieved</p>
    </div>
  `;
}

function getSubLesson4_4() {
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
            <li>Go to <strong>"Chord Quality"</strong> tab</li>
            <li><strong>Root position I chord</strong>: 
              <ul>
                <li>Click the <strong>"Do (I)"</strong> button to select it as the chord root</li>
                <li>Click the <strong>"Major (1-3-5)"</strong> button to select it as the chord quality</li>
                <li><strong>Notice</strong> - each button click will preview the chord for ~0.5 seconds</li>
                <li><strong>Watch the staff</strong> - you'll see Do, Mi, So displayed (Do is the lowest note shown)</li>
                <li>Click <strong>"Start Drone"</strong>, listen</li>
                <li>Notice Do is the bass (lowest note in the chord)</li>
                <li>Click <strong>"Stop Drone"</strong></li>
              </ul>
            </li>
            <li><strong>Understanding Inversions:</strong>
              <ul>
            <li>The Chord Quality tab has inversion buttons (Root, 1st, 2nd) that let you hear different voicings of the same chord</li>
            <li><strong>Root position</strong> (default): Do is the lowest note (Do, Mi, So)</li>
            <li><strong>First inversion</strong>: Click the "1st" button - Mi becomes the lowest note (Mi, So, Do)</li>
            <li><strong>Second inversion</strong>: Click the "2nd" button - So becomes the lowest note (So, Do, Mi)</li>
            <li>This is the same chord (Do-Mi-So) but "inverted" - different notes are in the bass</li>
            <li>Click the inversion buttons to hear how the chord sounds different with different bass notes</li>
            <li>In SATB, you'll see inversions when the bass part doesn't sing the root</li>
              </ul>
            </li>
            <li><strong>Practice with Warmup Arpeggios:</strong>
              <ul>
                <li>Go to <strong>"Warmup"</strong> tab</li>
                <li>Check the <strong>"Arpeggios (↑)"</strong> checkbox</li>
                <li>Click <strong>"Play Warm Up"</strong></li>
                <li><strong>Watch the staff</strong> - arpeggios show root position chords (root is always the first note)</li>
                <li>Notice how each arpeggio starts on the root (Do for I chord, Fa for IV chord, So for V chord)</li>
                <li>This helps you understand the base chord structure before learning inversions</li>
              </ul>
            </li>
          </ul>
        </li>
        <li><strong>Analyze Voice Leading in SATB:</strong>
          <ul>
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Select an exercise</li>
            <li><strong>Play the exercise slowly</strong> (set tempo to 50 BPM)</li>
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
        <li><strong>Identify Chord Inversions in SATB:</strong>
          <ul>
            <li><strong>Play an exercise</strong> and watch the staff</li>
            <li><strong>Look for chord moments</strong> (when all 4 parts have notes at the same time)</li>
            <li><strong>Identify the bass note</strong> (lowest note in Bass part)</li>
            <li><strong>If bass sings Do</strong> and other parts sing Mi, So = root position I chord</li>
            <li><strong>If bass sings Mi</strong> and other parts sing So, Do = first inversion I chord</li>
            <li><strong>If bass sings So</strong> and other parts sing Do, Mi = second inversion I chord</li>
            <li><strong>Shape notes help</strong> - you can see which solfege syllable the bass is singing</li>
          </ul>
        </li>
        <li><strong>Practice with Hidden Cluster Tab:</strong>
          <ul>
            <li>Go to <strong>"Hidden Cluster"</strong> tab</li>
            <li>Click <strong>"Hard"</strong> or <strong>"Extra Hard"</strong> difficulty</li>
            <li>Click <strong>"Play 3"</strong> or <strong>"Play 2"</strong></li>
            <li>This practices hearing complex harmony</li>
            <li><strong>Try to identify each tone</strong> in the cluster</li>
            <li><strong>Try to identify the chord</strong> (is it I? IV? V? Major? minor?)</li>
            <li>Click <strong>"Reveal"</strong> to check</li>
          </ul>
        </li>
        <li><strong>Practice All Chord Types:</strong>
          <ul>
            <li>Go to <strong>"Chord Quality"</strong> tab</li>
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
            <li><strong>Listen to the quality</strong> of each chord - each button click will preview the chord for ~0.5 seconds</li>
            <li><strong>Try different inversions</strong> - click Root, 1st, or 2nd to hear how the bass note changes the sound</li>
            <li><strong>Identify the chord tones</strong> by shape notes on the staff</li>
          </ul>
        </li>
        <li><strong>Sing Through Complete SATB Piece:</strong>
          <ul>
            <li>Go to <strong>"SATB Practice"</strong> tab</li>
            <li>Select a complete exercise</li>
            <li>Set <strong>"Aim For Part"</strong> to your part</li>
            <li>Set all parts to balanced volumes (50-60%)</li>
            <li>Set tempo to comfortable speed (start at 50-60 BPM)</li>
            <li><strong>Play and sing your part</strong> through the entire piece</li>
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
        <li>If chord identification is difficult, practice with Chord Quality tab more</li>
        <li>If SATB is overwhelming, practice with just 2 parts first (mute 2 parts)</li>
      </ul>
    </div>

    <div class="benchmark">
      <p><strong>Benchmark:</strong> Successfully sing a complete SATB piece with accurate pitch and rhythm, identifying chord progressions as you sing (you can name at least 3-4 chord progressions during the piece, e.g., "That was I → IV → V → I")</p>
      <p><strong>Progression:</strong> <strong>Congratulations! You've completed the curriculum.</strong></p>
    </div>
  `;
}

function renderLesson5() {
  return `
    <section class="lesson" id="lesson-5" data-lesson="5">
      <div class="lesson-header" data-lesson-toggle="5">
        <h2>Lesson 5: FA SO LA (Traditional Solfege Singing)</h2>
        <span class="lesson-toggle-icon">▼</span>
      </div>
      <div class="lesson-content" data-lesson-content="5">
        <p class="lesson-goal"><strong>Goal:</strong> Master the traditional practice of singing solfege syllables without lyrics using your own hymn MIDI files, building part independence and ear training</p>

        ${renderSubLesson('5.1', 'Understanding the FA SO LA Tradition', getSubLesson5_1())}
        ${renderSubLesson('5.2', 'Importing and Practicing with Your Own Hymn MIDI Files', getSubLesson5_2())}
      </div>
    </section>
  `;
}

function getSubLesson5_1() {
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
      <p><strong>Progression:</strong> Once you understand the tradition, proceed to Sub-lesson 5.2 to learn how to import and practice with your own hymn MIDI files.</p>
    </div>
  `;
}

function getSubLesson5_2() {
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
        <li><strong>Open the SATB Practice Tab:</strong>
          <ul>
            <li>Click on the <strong>"SATB Practice"</strong> tab</li>
            <li>You'll see the exercise dropdown and a file input for loading MIDI files</li>
          </ul>
        </li>
        <li><strong>Import Your MIDI File:</strong>
          <ul>
            <li>Find the <strong>"Load MIDI File"</strong> section in the SATB Practice tab</li>
            <li>Click the file input button (or the area that says "Select a MIDI file...")</li>
            <li>Navigate to your MIDI file on your computer and select it</li>
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
          </ul>
        </li>
        <li><strong>Verify the Import:</strong>
          <ul>
            <li>Once loaded, the new hymn will appear in the <strong>"Exercise"</strong> dropdown</li>
            <li>The file name (without .mid extension) will be used as the exercise name</li>
            <li>The staff will automatically display all four parts (Soprano, Alto, Tenor, Bass)</li>
            <li>You'll see the shape notes for each part based on the key signature you selected</li>
            <li>If the parts look wrong (e.g., all notes in one part), the MIDI file structure might be unusual - try a different file</li>
          </ul>
        </li>
        <li><strong>Select Your Imported Hymn:</strong>
          <ul>
            <li>In the <strong>"Exercise"</strong> dropdown, select your newly imported hymn</li>
            <li>The staff will update to show that hymn's notation</li>
            <li>You can switch between different imported hymns using this dropdown</li>
          </ul>
        </li>
        <li><strong>Choose Your Part:</strong>
          <ul>
            <li>Click on the part button you want to practice (S, A, T, or B)</li>
            <li>This sets which part you'll "aim for" - your part will be highlighted on the staff</li>
            <li>Start with the part that's most comfortable for your voice range</li>
          </ul>
        </li>
        <li><strong>Set Part Volumes:</strong>
          <ul>
            <li>Adjust the volume sliders for each part</li>
            <li><strong>Set your part volume lower (30-40%)</strong> - this is important! You want to hear yourself sing, not just follow the recording</li>
            <li>Set other parts to 50-60% so you can hear the harmony</li>
            <li>This simulates singing in a group where you need to hold your own part</li>
          </ul>
        </li>
        <li><strong>Set Tempo:</strong>
          <ul>
            <li>Start with a slow tempo (50-60 BPM) to give yourself time to think</li>
            <li>As you improve, gradually increase the tempo</li>
            <li>You can adjust this during playback if needed</li>
          </ul>
        </li>
        <li><strong>Enable Microphone (Optional but Recommended):</strong>
          <ul>
            <li>Click the <strong>"Start Mic"</strong> button in the header to enable microphone input</li>
            <li>Allow microphone access when prompted by your browser</li>
            <li>The app will show your detected pitch on the staff in real-time</li>
            <li>This gives you visual feedback on whether you're singing the correct pitch</li>
          </ul>
        </li>
        <li><strong>Practice Singing Solfege:</strong>
          <ul>
            <li>Click <strong>"Play"</strong> to start the exercise</li>
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
            <li>Each imported hymn stays in the exercise dropdown until you refresh the page</li>
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
            <li>Use the Flashcards tab to practice shape-to-solfege recognition</li>
            <li>Slow down and identify each note before singing</li>
            <li>Check the key signature - it affects which solfege syllable each note represents</li>
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

