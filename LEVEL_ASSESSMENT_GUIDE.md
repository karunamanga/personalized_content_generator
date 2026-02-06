# Knowledge Level Assessment Feature

## Overview
This implementation adds a knowledge level assessment feature to your MCQ learning platform. It evaluates users' expertise (Beginner/Intermediate/Advanced) on any topic and personalizes content accordingly.

## Features Implemented

### 1. **Backend APIs**

#### POST `/generate-level-test`
Generates 5 progressive difficulty questions to assess knowledge level.

**Request:**
```json
{
  "topic": "React"
}
```

**Response:**
```json
[
  {
    "question": "What is React?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "difficulty": "Beginner"
  },
  {
    "question": "How do hooks work?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B",
    "difficulty": "Intermediate"
  },
  ...
]
```

**Features:**
- Uses Gemini AI to generate contextual questions
- Differentiates progressively by difficulty level
- Returns 5 questions optimized for assessment
- Fallback to mock questions if API fails

---

#### POST `/evaluate-level`
Evaluates quiz answers and determines user's knowledge level.

**Request:**
```json
{
  "answers": ["Option A", "Option B", "Option C", "Option D", "Option A"],
  "correctAnswers": ["Option A", "Option B", "Option C", "Option D", "Option A"]
}
```

**Response:**
```json
{
  "success": true,
  "correct": 4,
  "total": 5,
  "percentage": 80,
  "level": "Advanced"
}
```

**Scoring:**
- 0-59% = Beginner
- 60-79% = Intermediate
- 80-100% = Advanced

---

### 2. **Frontend Components**

#### New State Variables
```javascript
// Level test questions and UI state
const [levelTestQuestions, setLevelTestQuestions] = useState([]);
const [levelTestIndex, setLevelTestIndex] = useState(0);
const [levelTestSelected, setLevelTestSelected] = useState("");
const [levelTestAnswers, setLevelTestAnswers] = useState([]);
const [showLevelTest, setShowLevelTest] = useState(false);
const [showLevelResult, setShowLevelResult] = useState(false);

// Results
const [detectedLevel, setDetectedLevel] = useState(null);
const [levelTestScore, setLevelTestScore] = useState(0);
```

#### Key Functions

**generateLevelTest()**
- Calls `/generate-level-test` with topic
- Loads questions and starts assessment
- Shows loading state during generation

**nextLevelTestQuestion()**
- Records user's answer
- Advances to next question
- Auto-evaluates on last question

**evaluateAndShowLevel()**
- Calls `/evaluate-level` with all answers
- Determines user level
- Shows results with percentage and level

**getContentForLevel()**
- Generates personalized content based on detected level
- Filters recommendations by expertise level
- Shows level-appropriate resources

---

## User Flow

```
1. Extract PDF & Take Quiz
   ↓
2. View Quiz Results (Score & Correct Count)
   ↓
3. Click "Assess Your Knowledge Level"
   ↓
4. Enter Topic (e.g., "React")
   ↓
5. Start Level Assessment (5 Questions)
   ├─ Question 1 (Beginner difficulty)
   ├─ Question 2 (Beginner-Intermediate)
   ├─ Question 3 (Intermediate)
   ├─ Question 4 (Intermediate-Advanced)
   └─ Question 5 (Advanced difficulty)
   ↓
6. View Results (Level: Beginner/Intermediate/Advanced)
   ↓
7. Generate Content for Your Level
   ↓
8. View Personalized Recommendations
   ↓
9. Assess Another Topic or New Session
```

---

## JSON Format Examples

### Assessment Question Format
```json
{
  "question": "What is the Virtual DOM in React?",
  "options": [
    "A copy of the real DOM in memory",
    "Read-only version of the DOM",
    "A caching mechanism",
    "Server-side rendering"
  ],
  "answer": "A copy of the real DOM in memory",
  "difficulty": "Intermediate"
}
```

### Level Test Request
```json
{
  "topic": "Python"
}
```

### Level Evaluation Request
```json
{
  "answers": [
    "List is ordered and mutable",
    "Using enumerate function",
    "List comprehension",
    "Dictionary mapping",
    "Higher-order functions"
  ],
  "correctAnswers": [
    "List is ordered and mutable",
    "Using enumerate function",
    "List comprehension",
    "Dictionary mapping",
    "Higher-order functions"
  ]
}
```

### Level Evaluation Response
```json
{
  "success": true,
  "correct": 5,
  "total": 5,
  "percentage": 100,
  "level": "Advanced"
}
```

---

## UI Components

### 1. Topic Input Screen
- Text input for topic
- "Start Level Assessment" button (enabled when topic entered)
- Back button to return to quiz result

### 2. Level Test Questions Screen
- Shows question number (X of 5)
- Displays difficulty level
- Radio button options
- "Next Question" or "Finish & Get Result" button
- Progress indicator

### 3. Level Result Screen
- Large display of detected level
- Score percentage
- Topic information
- "Generate Content for My Level" button
- Back/New Session options

### 4. Content Recommendations Screen
- Shows level-appropriate content
- Personalized based on detected level
- List of recommended topics
- "Assess Another Topic" option
- Full session reset

---

## Integration Points

### Dependencies Used
- **Frontend:** React hooks (useState, fetch API)
- **Backend:** Express.js, Google Generative AI (Gemini)
- **Protocol:** HTTP POST with JSON

### API Endpoints (3 new routes)
```
POST /generate-level-test  → Generate assessment questions
POST /evaluate-level       → Evaluate and determine level
POST /generate-topic       → Generate content for level (existing)
```

---

## Testing the Feature

### Quick Test Steps
1. Start backend: `npm run start` (port 5000)
2. Start frontend: `npm start` (port 3000)
3. Extract a PDF and complete the quiz
4. Click "Assess Your Knowledge Level"
5. Enter topic: "React" or "Python"
6. Answer the 5 assessment questions
7. View your determined level
8. Check generated content

### Expected Behavior
- ✅ Questions generated based on topic
- ✅ Questions get progressively harder
- ✅ Level determined based on percentage
- ✅ Content personalized to level
- ✅ Can assess multiple topics in one session
- ✅ Full state reset on "New Session"

---

## Error Handling

**Missing Topic:**
- Shows error message
- Blocks level test start

**API Failure:**
- Falls back to mock questions
- Shows user-friendly error
- Allows retry

**Invalid Responses:**
- Server validation for answer format
- Graceful error messages
- Stays on current screen for retry

---

## Customization Options

### Adjust Level Thresholds
In `/evaluate-level`:
```javascript
if (percentage >= 80) {
  level = "Advanced";  // Change 80 to any value
} else if (percentage >= 60) {
  level = "Intermediate";  // Change 60 to any value
}
```

### Change Question Count
In `/generate-level-test`, modify prompt:
```javascript
Generate exactly 5 MCQ questions  // Change 5 to any number
```

### Adjust Difficulty Distribution
Modify the Gemini prompt in `/generate-level-test` to request specific difficulty levels

---

## Files Modified

1. **backend/index.js**
   - Added `/generate-level-test` route
   - Added `/evaluate-level` route
   - Fixed answer normalization logic
   - Updated server logs

2. **mcq-app/src/App.js**
   - Added 8 new state variables for level assessment
   - Added `generateLevelTest()` function
   - Added `nextLevelTestQuestion()` function
   - Added `evaluateAndShowLevel()` function
   - Added `getContentForLevel()` function
   - Added 4 new UI sections (Topic input, Level test, Results, Content)
   - Updated quiz result button
   - Updated reset function

---

## Future Enhancements

- [ ] Save user level history
- [ ] Track progress over time
- [ ] Adaptive question difficulty based on answers
- [ ] Video recommendations for each level
- [ ] Integration with course recommendations
- [ ] Mobile responsive design
- [ ] Discussion forums by level
- [ ] Peer learning matching

---

## Troubleshooting

**Issue: "Level test generation failed"**
- Check backend is running on port 5000
- Check Gemini API key in `.env`
- Check network connection

**Issue: "Evaluation API failed"**
- Ensure answer format matches JSON
- Check request body structure
- Verify question count matches answer count

**Issue: Level always "Beginner"**
- Check scoring thresholds
- Verify answer comparison logic
- Check for case-sensitivity issues

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for server errors
3. Verify API responses in Network tab
4. Ensure all states are properly initialized

