# 📖 Japanese Kanji Reader

An AI-powered mobile PDF reader designed for Japanese language learners to
master kanji and vocabulary while reading their favorite books and manga.
This application provides real-time kanji analysis without interrupting the reading experience.
As of now, the kanji analysis only works with images.

# User Flow
- Open a new PDF page
- touch the "learn" button on the top right of the reading screen
- Quickly visualize:
    * Context of what is being said on the page (AI-generated)
    * All Kanji present on page (e.g: ['漢', '字'])
    * All the words that are being formed by the kanji on the page (e.g: 漢字)
- Update the view counter on a kanji everytime you see them in your reading journey
- Check the "knowledge bank" to see how many times you've seen each kanji, along with kanji
you've never seen before. Works just like a Pokedex!

Like reading with the help of a dictionary, but much more practical!

## 🎯 Project Vision

**Core Principle**: Non-intrusive learning that never interrupts reading flow

**Key Innovation**: Universal kanji knowledge bank that grows across all reading materials - kanji learned in manga helps with novels, news articles, and any other Japanese content.

#### **📱 Core Reading Experience**
- **PDF Import & Reading**: Full PDF viewer with page navigation and progress tracking
- **Image Analysis**: Complete OCR pipeline for Japanese text extraction form PDF pages
- **File Management**: Local storage system for imported PDFs
- **Reading Progress**: Automatic bookmark saving and quick resume functionality

#### **🧠 Knowledge System Foundation**
- **Kanji Database**: SQLite integration with KANJIDIC2, JMdict, KRADFILE, and RTK stories
- **Universal Knowledge Bank**: Cross-content kanji tracking system
- **Japanese Text Processing**: OCR with Google Cloud Vision API for image analysis
- **Gamefied learning**: Unlock new kanji as you read more books

#### **🎨 User Interface**
- **Bottom Sheet Learning**: Non-intrusive kanji analysis interface
- **Progress Visualization**: Reading statistics and knowledge bank metrics

#### **💾 Data Architecture**
- **Local-First Storage**: Complete offline capability for processed content
- **Smart Caching**: OCR results and text analysis cached permanently
- **Reference Databases**: ~70MB of bundled Japanese language data

### ⏳ **In Development**

#### **Text Processing Pipeline**
- **PDF Import & Reading**: Full PDF viewer with page navigation and progress tracking
- **PDF Text Extraction**: Connecting PDF viewer to Japanese text analysis
- **Real-time Kanji Identification**: Live analysis during PDF reading
- **Knowledge Bank Integration**: Automatic "times seen" counter updates
- **Learning Progress Tracking**: New vs. previously encountered kanji detection

### 📋 **Planned Features (Future Phases)**

#### **Phase 2: Enhanced Learning**
- Advanced kanji organization (grouping, search, sorting)
- Detailed radical breakdown and stroke order
- Smart offline preprocessing for entire books
- Performance optimization for large documents

#### **Phase 3: Cloud & Social**
- Cross-device sync and backup
- Vocabulary and context sections
- Gamified learning strategies

## 🏗 Technical Architecture

### **Technology Stack**
- **Frontend**: React Native with TypeScript
- **PDF Processing**: react-native-pdf (with planned MuPDF migration)
- **OCR**: Google Cloud Vision API (Japanese optimized)
- **Text Analysis**: SudachiPy (planned for morphological analysis)
- **Local Storage**: AsyncStorage + SQLite + File System
- **Navigation**: React Navigation v6

### **Data Flow**
```
PDF/Image → Text Extraction → Japanese Analysis → Kanji Identification → (TO-DO) Knowledge Bank Update → UI Display
```

### **Storage Strategy**
```
Local Storage:
├── Knowledge Bank (AsyncStorage) - Universal kanji progress
├── Content Cache (File System) - OCR and analysis results
├── Reference Databases (SQLite) - KANJIDIC2, JMdict, RTK stories
└── User Files (File System) - Imported PDFs
```

## 🛠 Development Setup

### **Prerequisites**
- Node.js 18+
- Expo CLI
- Android Studio (for Android development)
- Google Cloud Vision API key

### **Installation**
# Clone the repository
git clone [git@github.com:gabriel-bizioo/kanji-reader.git]
cd japanese-kanji-reader

# Install dependencies
npm install

# Add your google cloud vision API key
echo 'GOOGLE_CLOUD_VISION_API_KEY=[YOU API KEY]' > .env

# Start development server
npx expo start

### **Testing**
- **Expo Go**: Scan QR code for immediate testing on mobile devices

## 📱 Current User Experience

### **Home Screen**
- Quick resume to last read content
- Knowledge bank statistics (total kanji, encountered kanji, progress metrics)
- Recent content library with file management
- Import options for PDFs
- Currently, can import images to test kanji recognition

### **(TO-DO) PDF Reading** 
- Full-screen PDF viewer with smooth navigation
- Floating learn button (学) for accessing kanji analysis
- Reading progress persistence and visualization
- Header overlay with book title and page numbers

### **Image Analysis**
- Camera integration for capturing Japanese text
- Real-time OCR processing with confidence scores
- Complete kanji identification and analysis
- Integration with universal knowledge bank
- (TO-DO) List Kanji that appear onn the page

### **Learning Interface**
- Bottom sheet design for non-intrusive access
- Kanji categorization (New vs. Previously Seen)
- "Knowledge bank" section for reviewing kanji
- Search and sorting capabilities
- Expandable details sourcing stories from the book "Remembering the Kanji"
for effective memorization

## 📊 Current Limitations

### **Technical Constraints**
- **New Content Processing**: Requires internet for OCR of unprocessed pages

### **Feature Gaps**
- **PDF reader**: Not yet implemented
- **Kanji listing**: Kanji are properly iodentified in images, but not listed in the bottom sheet
- **PDF Kanji Analysis**: Not yet connected to reading workflow
- **Vocabulary Section**: Planned for future development
- **Cloud Sync**: Local-only in current version
- **Advanced Analytics**: Basic progress tracking only

## 🛣 Development Roadmap

### **Immediate**
1. **Complete PDF Text Processing Pipeline**
   - Connect PDF text extraction to kanji analysis
   - Implement real-time knowledge bank updates

2. **Polish MVP Experience**
   - Error handling and edge cases
   - Performance optimization
   - User feedback and loading states

### **Short Term**
1. **Beta Testing**
   - Real user feedback and iteration
   - Performance testing with large books
   - Stability improvements

2. **App Store Preparation**
   - Final UI polish and animations
   - App store assets and descriptions
   - Privacy policy and legal compliance

### **Medium Term**
1. **Enhanced Learning Features**
   - Advanced kanji organization
   - Detailed learning analytics

2. **Platform Expansion**
   - Google Play Store release
   - Performance optimization for older devices

## 🤝 Contributing

This project is currently in active development. Feedback and testing are welcome!

### **Current Needs**
- Japanese language learners for user testing
- Performance testing on various devices
- UI/UX feedback and suggestions

## 📄 License

[https://mit-license.org]

## 📞 Contact

[bizio.gabriel@gmail.com]

---

**Built using Claude AI**
