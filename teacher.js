class LessonBuilder {
  constructor() {
    this.currentLesson = {
      name: '',
      date: '',
      blocks: []
    };
    this.setupEventListeners();
    this.loadLessonsList();
  }

  setupEventListeners() {
    // Form submission
    document.getElementById('lessonForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.currentLesson.name = document.getElementById('lessonName').value;
      this.currentLesson.date = document.getElementById('lessonDate').value;
      this.saveLesson();
    });

    // Drag and drop
    const draggables = document.querySelectorAll('.draggable');
    const dropZone = document.getElementById('dropZone');

    draggables.forEach(draggable => {
      draggable.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', e.target.dataset.type);
      });
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const blockType = e.dataTransfer.getData('text/plain');
      this.addBlock(blockType);
    });
  }

  loadLessonsList() {
    fetch('lessons.php')
      .then(response => response.json())
      .then(lessons => {
        const selectLesson = document.getElementById('selectLesson');
        selectLesson.innerHTML = '<option value="">Select a lesson to edit</option>';
        
        lessons.forEach(lesson => {
          const option = document.createElement('option');
          option.value = lesson.id;
          option.textContent = `${lesson.name} (${lesson.date})`;
          selectLesson.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Error loading lessons:', error);
      });
  }

  loadLesson(lessonId) {
    fetch(`lessons.php?id=${lessonId}`)
      .then(response => response.json())
      .then(lesson => {
        this.currentLesson = lesson;
        
        // Update form fields
        document.getElementById('lessonName').value = lesson.name;
        document.getElementById('lessonDate').value = lesson.date;
        
        // Clear existing blocks
        document.getElementById('blockContainer').innerHTML = '';
        
        // Render blocks
        lesson.blocks.forEach(block => {
          this.renderBlock(block);
        });
      })
      .catch(error => {
        console.error('Error loading lesson:', error);
      });
  }

  addBlock(type) {
    const block = {
      id: Date.now(),
      type,
      config: {}
    };

    this.currentLesson.blocks.push(block);
    this.renderBlock(block);
  }

  renderBlock(block) {
    const container = document.getElementById('blockContainer');
    const blockElement = document.createElement('div');
    blockElement.className = 'learning-block';
    blockElement.innerHTML = `
      <h5>${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Exercise</h5>
      <p>Click to configure</p>
    `;
    
    blockElement.addEventListener('click', () => this.showConfig(block));
    container.appendChild(blockElement);
  }

  showConfig(block) {
    const modal = new bootstrap.Modal(document.getElementById('configModal'));
    const configForm = document.getElementById('configForm');
    
    configForm.innerHTML = this.getConfigForm(block);
    
    configForm.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveBlockConfig(block, e.target);
      modal.hide();
    });
    
    modal.show();
  }

  getConfigForm(block) {
    if (block.type === 'flashcard') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Time Limit (seconds)</label>
            <input type="number" class="form-control" name="timeLimit" value="${block.config.timeLimit || 300}" required>
          </div>
          <div id="cardPairs">
            <h6>Card Pairs</h6>
            ${this.getCardPairInputs(block.config.cards || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addCardPair()">Add Card Pair</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'translation') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Sentence to Translate</label>
            <input type="text" class="form-control" name="sentence" value="${block.config.sentence || ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Correct Translation</label>
            <input type="text" class="form-control" name="correctAnswer" value="${block.config.correctAnswer || ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Vocabulary Hints (comma-separated)</label>
            <input type="text" class="form-control" name="vocabulary" value="${(block.config.vocabulary || []).join(', ')}" required>
          </div>
          <button type="submit" class="btn btn-primary">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'hotspot') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div class="mb-3">
            <label class="form-label">Image URL</label>
            <input type="url" class="form-control" name="imageUrl" value="${block.config.imageUrl || ''}" onchange="lessonBuilder.updatePreviewImage(this.value)" required>
          </div>
          <div class="mb-3">
            <div id="imagePreview" style="position: relative; width: 600px; height: 400px; border: 1px solid #ccc; margin: 0 auto;">
              <p class="text-center" style="padding-top: 180px">Image preview will appear here</p>
            </div>
          </div>
          <div id="hotspots">
            <h6>Hotspots</h6>
            ${this.getHotspotInputs(block.config.hotspots || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.startHotspotPlacement()">Add Hotspot</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'highlight') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="exercises">
            <h6>Exercises</h6>
            ${this.getHighlightExerciseInputs(block.config.exercises || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addHighlightExercise()">Add Exercise</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'imageclick') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div class="mb-3">
            <div id="imageInputs">
              ${[1,2,3,4,5].map(i => `
                <div class="mb-2">
                  <label class="form-label">Image ${i} URL</label>
                  <input type="url" class="form-control" name="image${i}" value="${block.config['image'+i] || ''}" required>
                </div>
              `).join('')}
            </div>
          </div>
          <div id="questions">
            <h6>Questions</h6>
            ${this.getImageClickQuestionInputs(block.config.questions || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addImageClickQuestion()">Add Question</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'dialogue') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="dialogues">
            <h6>Dialogue Pairs</h6>
            ${this.getDialoguePairInputs(block.config.dialogues || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addDialoguePair()">Add Dialogue Pair</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'singlephrase') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="phrases">
            <h6>Phrases</h6>
            ${this.getPhrasePairInputs(block.config.phrases || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addPhrasePair()">Add Phrase</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'sentencematch') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="sentences">
            <h6>Sentences</h6>
            ${this.getSentencePairInputs(block.config.sentences || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addSentencePair()">Add Green Card</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'pickpicture') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="exercises">
            <h6>Exercises</h6>
            ${this.getPictureExerciseInputs(block.config.exercises || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addPictureExercise()">Add Exercise</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'accent') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="sentences">
            <h6>Sentences</h6>
            ${this.getAccentSentenceInputs(block.config.sentences || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addAccentSentence()">Add Sentence</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    } else if (block.type === 'spelling') {
      return `
        <form>
          <div class="mb-3">
            <label class="form-label">Instructions</label>
            <input type="text" class="form-control" name="instructions" value="${block.config.instructions || ''}" required>
          </div>
          <div id="exercises">
            <h6>Exercises</h6>
            ${this.getSpellingExerciseInputs(block.config.exercises || [])}
          </div>
          <button type="button" class="btn btn-secondary" onclick="lessonBuilder.addSpellingExercise()">Add Exercise</button>
          <button type="submit" class="btn btn-primary mt-3">Save Configuration</button>
        </form>
      `;
    }
  }

  updatePreviewImage(url) {
    const preview = document.getElementById('imagePreview');
    preview.style.backgroundImage = `url(${url})`;
    preview.style.backgroundSize = 'contain';
    preview.style.backgroundRepeat = 'no-repeat';
    preview.style.backgroundPosition = 'center';
    preview.innerHTML = '';
  }

  getHotspotInputs(hotspots = []) {
    return hotspots.map((hotspot, index) => `
      <div class="row mb-2 hotspot-row">
        <div class="col">
          <input type="text" class="form-control" name="label${index}" placeholder="Label" value="${hotspot.label || ''}" required>
        </div>
        <div class="col">
          <input type="text" class="form-control" name="answer${index}" placeholder="Correct Answer" value="${hotspot.answer || ''}" required>
        </div>
        <div class="col">
          <input type="text" class="form-control" name="options${index}" placeholder="Wrong options (comma-separated)" value="${(hotspot.wrongOptions || []).join(', ')}" required>
        </div>
        <div class="col-auto">
          <input type="hidden" name="x${index}" value="${hotspot.x}">
          <input type="hidden" name="y${index}" value="${hotspot.y}">
          <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeHotspot(${index})">Remove</button>
        </div>
      </div>
    `).join('');
  }

  getCardPairInputs(cards = []) {
    return cards.map((card, index) => `
      <div class="row mb-2">
        <div class="col">
          <input type="text" class="form-control" name="english${index}" placeholder="English" value="${card.english || ''}" required>
        </div>
        <div class="col">
          <input type="text" class="form-control" name="spanish${index}" placeholder="Spanish" value="${card.spanish || ''}" required>
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeCardPair(${index})">Remove</button>
        </div>
      </div>
    `).join('');
  }

  addCardPair() {
    const cardPairs = document.getElementById('cardPairs');
    const newIndex = cardPairs.children.length;
    const newPair = document.createElement('div');
    newPair.innerHTML = this.getCardPairInputs([{}]);
    cardPairs.appendChild(newPair);
  }

  removeCardPair(index) {
    const cardPairs = document.getElementById('cardPairs');
    cardPairs.children[index].remove();
  }

  startHotspotPlacement() {
    const preview = document.getElementById('imagePreview');
    preview.style.cursor = 'crosshair';
    
    const clickHandler = (e) => {
      const rect = preview.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(2);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(2);
      
      const hotspots = document.getElementById('hotspots');
      const index = hotspots.children.length;
      const newHotspot = document.createElement('div');
      newHotspot.innerHTML = this.getHotspotInputs([{
        x, y,
        label: '',
        answer: '',
        wrongOptions: []
      }]);
      hotspots.appendChild(newHotspot);
      
      // Add visual marker
      const marker = document.createElement('div');
      marker.className = 'hotspot-marker';
      marker.style.cssText = `
        position: absolute;
        left: ${x}%;
        top: ${y}%;
        width: 20px;
        height: 20px;
        background: rgba(255, 0, 0, 0.5);
        border-radius: 50%;
      `;
      preview.appendChild(marker);
      
      preview.style.cursor = 'default';
      preview.removeEventListener('click', clickHandler);
    };
    
    preview.addEventListener('click', clickHandler);
  }

  removeHotspot(index) {
    const hotspots = document.getElementById('hotspots');
    const markers = document.querySelectorAll('.hotspot-marker');
    if (markers[index]) markers[index].remove();
    hotspots.children[index].remove();
  }

  getHighlightExerciseInputs(exercises = []) {
    return exercises.map((exercise, index) => `
      <div class="exercise-row mb-3">
        <div class="mb-2">
          <label class="form-label">Text</label>
          <input type="text" class="form-control" name="text${index}" value="${exercise.text || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Question</label>
          <input type="text" class="form-control" name="question${index}" value="${exercise.question || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Correct Words (comma-separated)</label>
          <input type="text" class="form-control" name="correctWords${index}" value="${(exercise.correctWords || []).join(', ')}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeHighlightExercise(${index})">Remove Exercise</button>
      </div>
    `).join('');
  }

  getImageClickQuestionInputs(questions = []) {
    return questions.map((question, index) => `
      <div class="question-row mb-3">
        <div class="mb-2">
          <label class="form-label">Question Text</label>
          <input type="text" class="form-control" name="questionText${index}" value="${question.text || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Correct Box Number (1-5)</label>
          <input type="number" class="form-control" name="correctBox${index}" min="1" max="5" value="${question.correctBox || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Correct Image Number (1-5)</label>
          <input type="number" class="form-control" name="correctImage${index}" min="1" max="5" value="${question.correctImage || ''}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeImageClickQuestion(${index})">Remove Question</button>
      </div>
    `).join('');
  }

  getDialoguePairInputs(dialogues = []) {
    return dialogues.map((dialogue, index) => `
      <div class="dialogue-row mb-3">
        <div class="mb-2">
          <label class="form-label">Speaker A English</label>
          <input type="text" class="form-control" name="speakerAEng${index}" value="${dialogue.speakerAEng || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Speaker A Spanish</label>
          <input type="text" class="form-control" name="speakerASpa${index}" value="${dialogue.speakerASpa || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Speaker B English</label>
          <input type="text" class="form-control" name="speakerBEng${index}" value="${dialogue.speakerBEng || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Speaker B Spanish</label>
          <input type="text" class="form-control" name="speakerBSpa${index}" value="${dialogue.speakerBSpa || ''}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeDialoguePair(${index})">Remove Dialogue</button>
      </div>
    `).join('');
  }

  addHighlightExercise() {
    const exercises = document.getElementById('exercises');
    const newExercise = document.createElement('div');
    newExercise.innerHTML = this.getHighlightExerciseInputs([{}]);
    exercises.appendChild(newExercise);
  }

  removeHighlightExercise(index) {
    const exercises = document.getElementById('exercises');
    exercises.children[index].remove();
  }

  addImageClickQuestion() {
    const questions = document.getElementById('questions');
    const newQuestion = document.createElement('div');
    newQuestion.innerHTML = this.getImageClickQuestionInputs([{}]);
    questions.appendChild(newQuestion);
  }

  removeImageClickQuestion(index) {
    const questions = document.getElementById('questions');
    questions.children[index].remove();
  }

  addDialoguePair() {
    const dialogues = document.getElementById('dialogues');
    const newDialogue = document.createElement('div');
    newDialogue.innerHTML = this.getDialoguePairInputs([{}]);
    dialogues.appendChild(newDialogue);
  }

  removeDialoguePair(index) {
    const dialogues = document.getElementById('dialogues');
    dialogues.children[index].remove();
  }

  getPhrasePairInputs(phrases = []) {
    return phrases.map((phrase, index) => `
      <div class="phrase-row mb-3">
        <div class="mb-2">
          <label class="form-label">Prompt (with context in parentheses)</label>
          <input type="text" class="form-control" name="prompt${index}" value="${phrase.prompt || ''}" required>
        </div>
        <div class="mb-2">
          <label class="form-label">Correct Answer</label>
          <input type="text" class="form-control" name="answer${index}" value="${phrase.answer || ''}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removePhrasePair(${index})">Remove Phrase</button>
      </div>
    `).join('');
  }

  addPhrasePair() {
    const phrases = document.getElementById('phrases');
    const newPhrase = document.createElement('div');
    newPhrase.innerHTML = this.getPhrasePairInputs([{}]);
    phrases.appendChild(newPhrase);
  }

  removePhrasePair(index) {
    const phrases = document.getElementById('phrases');
    phrases.children[index].remove();
  }

  getSentencePairInputs(sentences = []) {
    return sentences.map((sentence, index) => `
      <div class="sentence-row mb-4 border p-3">
        <div class="mb-2">
          <label class="form-label">Green Card Incomplete Sentence</label>
          <input type="text" class="form-control" name="greenCard${index}" value="${sentence.greenCard || ''}" required>
        </div>
        <div id="whiteCards${index}">
          <h6>White Cards (Sentence Completions)</h6>
          ${(sentence.whiteCards || []).map((whiteCard, wIndex) => `
            <div class="row mb-2">
              <div class="col">
                <input type="text" class="form-control" name="whiteCard${index}_${wIndex}" value="${whiteCard}" required>
              </div>
              <div class="col-auto">
                <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeWhiteCard(${index}, ${wIndex})">Remove</button>
              </div>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn btn-info mb-2" onclick="lessonBuilder.addWhiteCard(${index})">Add White Card</button>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeSentencePair(${index})">Remove Green Card</button>
      </div>
    `).join('');
  }

  addSentencePair() {
    const sentences = document.getElementById('sentences');
    const newIndex = sentences.children.length;
    const newPair = document.createElement('div');
    newPair.innerHTML = this.getSentencePairInputs([{
      greenCard: '',
      whiteCards: ['']
    }]);
    sentences.appendChild(newPair);
  }

  removeSentencePair(index) {
    const sentences = document.getElementById('sentences');
    sentences.children[index].remove();
  }

  addWhiteCard(index) {
    const whiteCards = document.getElementById(`whiteCards${index}`);
    const newWhiteCard = document.createElement('div');
    const wIndex = whiteCards.children.length - 1;
    newWhiteCard.innerHTML = `
      <div class="row mb-2">
        <div class="col">
          <input type="text" class="form-control" name="whiteCard${index}_${wIndex}" value="" required>
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeWhiteCard(${index}, ${wIndex})">Remove</button>
        </div>
      </div>
    `;
    whiteCards.appendChild(newWhiteCard);
  }

  removeWhiteCard(sentenceIndex, cardIndex) {
    const whiteCards = document.getElementById(`whiteCards${sentenceIndex}`);
    whiteCards.children[cardIndex].remove();
  }

  getPictureExerciseInputs(exercises = []) {
    return exercises.map((exercise, index) => `
      <div class="exercise-row mb-4 border p-3">
        <div class="mb-2">
          <label class="form-label">Verb/Concept</label>
          <input type="text" class="form-control" name="verb${index}" value="${exercise.verb || ''}" required>
        </div>
        <div id="images${index}">
          <h6>Images (URLs)</h6>
          ${[0,1,2,3].map(imgIndex => `
            <div class="row mb-2">
              <div class="col">
                <input type="url" class="form-control" name="image${index}_${imgIndex}" 
                  value="${exercise.images?.[imgIndex] || ''}" required 
                  placeholder="Image URL ${imgIndex + 1}">
              </div>
            </div>
          `).join('')}
        </div>
        <div class="mb-2">
          <label class="form-label">Correct Answer Indices (comma-separated, 0-3)</label>
          <input type="text" class="form-control" name="correctAnswers${index}" 
            value="${(exercise.correctAnswers || []).join(',')}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removePictureExercise(${index})">Remove Exercise</button>
      </div>
    `).join('');
  }

  addPictureExercise() {
    const exercises = document.getElementById('exercises');
    const newExercise = document.createElement('div');
    newExercise.innerHTML = this.getPictureExerciseInputs([{}]);
    exercises.appendChild(newExercise);
  }

  removePictureExercise(index) {
    const exercises = document.getElementById('exercises');
    exercises.children[index].remove();
  }

  getSpellingExerciseInputs(exercises = []) {
    return exercises.map((exercise, index) => `
      <div class="exercise-row mb-3">
        <div class="exercise-config">
          <div class="mb-2">
            <label class="form-label">Word</label>
            <div class="word-input-container">
              <input type="text" class="form-control word-input" 
                     name="word${index}" value="${exercise.word || ''}" required
                     oninput="lessonBuilder.updateSpellingPreview(${index})">
            </div>
          </div>
          <div class="word-preview mb-2" id="preview${index}">
            ${this.createSpellingPreview(exercise.word || '', exercise.missingIndices || [])}
          </div>
          <input type="hidden" class="missing-indices" name="missingIndices${index}" 
                 value="${JSON.stringify(exercise.missingIndices || [])}">
        </div>
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeSpellingExercise(${index})">Remove Exercise</button>
      </div>
    `).join('');
  }

  createSpellingPreview(word, missingIndices = []) {
    if (!word) return '';
    return word.split('').map((letter, index) => `
      <span class="letter-preview" 
            data-index="${index}"
            onclick="lessonBuilder.toggleMissingLetter(${index}, this.parentElement.closest('.exercise-row'))"
            style="cursor: pointer; ${missingIndices.includes(index) ? 'background-color: #bef264;' : ''}"
      >${letter}</span>
    `).join('');
  }

  updateSpellingPreview(index) {
    const row = document.querySelector(`.exercise-row:nth-child(${index + 1})`);
    const word = row.querySelector('.word-input').value.toUpperCase();
    const missingIndices = JSON.parse(row.querySelector('.missing-indices').value);
    const preview = row.querySelector('.word-preview');
    preview.innerHTML = this.createSpellingPreview(word, missingIndices);
  }

  toggleMissingLetter(letterIndex, exerciseRow) {
    const missingIndicesInput = exerciseRow.querySelector('.missing-indices');
    let missingIndices = JSON.parse(missingIndicesInput.value || '[]');
    
    const indexPosition = missingIndices.indexOf(letterIndex);
    if (indexPosition === -1) {
      missingIndices.push(letterIndex);
    } else {
      missingIndices.splice(indexPosition, 1);
    }
    
    missingIndicesInput.value = JSON.stringify(missingIndices);
    this.updateSpellingPreview(Array.from(document.querySelectorAll('.exercise-row')).indexOf(exerciseRow));
  }

  addSpellingExercise() {
    const exercises = document.getElementById('exercises');
    const newExercise = document.createElement('div');
    newExercise.innerHTML = this.getSpellingExerciseInputs([{}]);
    exercises.appendChild(newExercise);
  }

  removeSpellingExercise(index) {
    const exercises = document.getElementById('exercises');
    exercises.children[index].remove();
  }

  getAccentSentenceInputs(sentences = []) {
    return sentences.map((sentence, index) => `
      <div class="sentence-row mb-3">
        <div class="mb-2">
          <label class="form-label">Sentence</label>
          <input type="text" class="form-control sentence-text" 
                 name="sentence${index}" value="${sentence.text || ''}" required
                 onkeyup="lessonBuilder.updateAccentPreview(${index})">
        </div>
        <div class="preview-area mb-2" id="preview${index}">
          ${this.createAccentPreview(sentence.text || '', sentence.corrections || [])}
        </div>
        <input type="hidden" class="corrections-input" name="corrections${index}" 
               value="${JSON.stringify(sentence.corrections || [])}">
        <button type="button" class="btn btn-danger" onclick="lessonBuilder.removeAccentSentence(${index})">Remove Sentence</button>
      </div>
    `).join('');
  }

  createAccentPreview(text, corrections = []) {
    if (!text) return '';
    const words = text.split(' ');
    return words.map((word, wordIndex) => {
      const wordStart = text.indexOf(word);
      return word.split('').map((letter, letterIndex) => {
        const globalIndex = wordStart + letterIndex;
        const correction = corrections.find(c => c.index === globalIndex);
        const hasAccent = correction ? correction.accent : letter;
        return `<span class="letter-preview" 
                      data-index="${globalIndex}"
                      onclick="lessonBuilder.toggleAccent(${globalIndex}, this.parentElement.closest('.sentence-row'))"
                      style="cursor: pointer; ${correction ? 'background-color: #bef264;' : ''}"
                >${hasAccent}</span>`;
      }).join('');
    }).join(' ');
  }

  updateAccentPreview(index) {
    const row = document.querySelector(`.sentence-row:nth-child(${index + 1})`);
    const text = row.querySelector('.sentence-text').value;
    const corrections = JSON.parse(row.querySelector('.corrections-input').value);
    const preview = row.querySelector('.preview-area');
    preview.innerHTML = this.createAccentPreview(text, corrections);
  }

  toggleAccent(letterIndex, sentenceRow) {
    const text = sentenceRow.querySelector('.sentence-text').value;
    const correctionsInput = sentenceRow.querySelector('.corrections-input');
    let corrections = JSON.parse(correctionsInput.value || '[]');
    
    const existingIndex = corrections.findIndex(c => c.index === letterIndex);
    if (existingIndex !== -1) {
      corrections.splice(existingIndex, 1);
    } else {
      const letter = text[letterIndex];
      let accent;
      switch(letter.toLowerCase()) {
        case 'a': accent = 'á'; break;
        case 'e': accent = 'é'; break;
        case 'i': accent = 'í'; break;
        case 'o': accent = 'ó'; break;
        case 'u': accent = 'ú'; break;
        case 'n': accent = 'ñ'; break;
        default: return;
      }
      corrections.push({ index: letterIndex, accent });
    }
    
    correctionsInput.value = JSON.stringify(corrections);
    this.updateAccentPreview(Array.from(document.querySelectorAll('.sentence-row')).indexOf(sentenceRow));
  }

  addAccentSentence() {
    const sentences = document.getElementById('sentences');
    const newIndex = sentences.children.length;
    const sentenceDiv = document.createElement('div');
    sentenceDiv.innerHTML = this.getAccentSentenceInputs([{}]);
    sentences.appendChild(sentenceDiv);
  }

  removeAccentSentence(index) {
    const sentences = document.getElementById('sentences');
    sentences.children[index].remove();
  }

  saveBlockConfig(block, form) {
    if (block.type === 'flashcard') {
      const cards = [];
      const formData = new FormData(form);
      let index = 0;
      
      while (formData.get(`english${index}`) !== null) {
        cards.push({
          english: formData.get(`english${index}`),
          spanish: formData.get(`spanish${index}`)
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        timeLimit: parseInt(formData.get('timeLimit')),
        cards
      };
    } else if (block.type === 'translation') {
      const formData = new FormData(form);
      block.config = {
        instructions: formData.get('instructions'),
        sentence: formData.get('sentence'),
        correctAnswer: formData.get('correctAnswer'),
        vocabulary: formData.get('vocabulary').split(',').map(word => word.trim())
      };
    } else if (block.type === 'hotspot') {
      const formData = new FormData(form);
      const hotspots = [];
      let index = 0;
      
      while (formData.get(`label${index}`) !== null) {
        hotspots.push({
          label: formData.get(`label${index}`),
          answer: formData.get(`answer${index}`),
          wrongOptions: formData.get(`options${index}`).split(',').map(opt => opt.trim()),
          x: formData.get(`x${index}`),
          y: formData.get(`y${index}`)
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        imageUrl: formData.get('imageUrl'),
        hotspots
      };
    } else if (block.type === 'highlight') {
      const formData = new FormData(form);
      const exercises = [];
      let index = 0;
      
      while (formData.get(`text${index}`) !== null) {
        exercises.push({
          text: formData.get(`text${index}`),
          question: formData.get(`question${index}`),
          correctWords: formData.get(`correctWords${index}`).split(',').map(word => word.trim())
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        exercises
      };
    } else if (block.type === 'imageclick') {
      const formData = new FormData(form);
      const questions = [];
      let index = 0;
      
      const images = {};
      for (let i = 1; i <= 5; i++) {
        images[`image${i}`] = formData.get(`image${i}`);
      }
      
      while (formData.get(`questionText${index}`) !== null) {
        questions.push({
          text: formData.get(`questionText${index}`),
          correctBox: parseInt(formData.get(`correctBox${index}`)),
          correctImage: parseInt(formData.get(`correctImage${index}`))
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        ...images,
        questions
      };
    } else if (block.type === 'dialogue') {
      const formData = new FormData(form);
      const dialogues = [];
      let index = 0;
      
      while (formData.get(`speakerAEng${index}`) !== null) {
        dialogues.push({
          speakerAEng: formData.get(`speakerAEng${index}`),
          speakerASpa: formData.get(`speakerASpa${index}`),
          speakerBEng: formData.get(`speakerBEng${index}`),
          speakerBSpa: formData.get(`speakerBSpa${index}`)
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        dialogues
      };
    } else if (block.type === 'singlephrase') {
      const formData = new FormData(form);
      const phrases = [];
      let index = 0;
      
      while (formData.get(`prompt${index}`) !== null) {
        phrases.push({
          prompt: formData.get(`prompt${index}`),
          answer: formData.get(`answer${index}`)
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        phrases
      };
    } else if (block.type === 'sentencematch') {
      const formData = new FormData(form);
      const sentences = [];
      let index = 0;
      
      while (formData.get(`greenCard${index}`) !== null) {
        const whiteCards = [];
        let wIndex = 0;
        while (formData.get(`whiteCard${index}_${wIndex}`) !== null) {
          whiteCards.push(formData.get(`whiteCard${index}_${wIndex}`));
          wIndex++;
        }
        
        sentences.push({
          greenCard: formData.get(`greenCard${index}`),
          whiteCards: whiteCards
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        sentences
      };
    } else if (block.type === 'pickpicture') {
      const formData = new FormData(form);
      const exercises = [];
      let index = 0;
      
      while (formData.get(`verb${index}`) !== null) {
        const images = [];
        for (let i = 0; i < 4; i++) {
          images.push(formData.get(`image${index}_${i}`));
        }
        
        exercises.push({
          verb: formData.get(`verb${index}`),
          images: images,
          correctAnswers: formData.get(`correctAnswers${index}`).split(',').map(num => parseInt(num.trim()))
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        exercises
      };
    } else if (block.type === 'accent') {
      const formData = new FormData(form);
      const sentences = [];
      let index = 0;
      
      while (formData.get(`sentence${index}`) !== null) {
        sentences.push({
          text: formData.get(`sentence${index}`),
          corrections: JSON.parse(formData.get(`corrections${index}`) || '[]')
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        sentences
      };
    } else if (block.type === 'spelling') {
      const formData = new FormData(form);
      const exercises = [];
      let index = 0;
      
      while (formData.get(`word${index}`) !== null) {
        exercises.push({
          word: formData.get(`word${index}`).toUpperCase(),
          missingIndices: JSON.parse(formData.get(`missingIndices${index}`) || '[]')
        });
        index++;
      }

      block.config = {
        instructions: formData.get('instructions'),
        exercises
      };
    }
    
    this.saveLesson();
  }

  saveLesson() {
    fetch('lessons.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.currentLesson)
    })
    .then(response => response.json())
    .then(data => {
      if (data.id) {
        // Update the lesson ID if it was generated by the server
        this.currentLesson.id = data.id;
        alert('Lesson saved successfully!');
        this.loadLessonsList();
      } else {
        alert('Error: ' + data.error);
      }
    })
    .catch(error => {
      console.error('Error saving lesson:', error);
      alert('Error saving lesson. Check console for details.');
    });
  }
}

const lessonBuilder = new LessonBuilder();