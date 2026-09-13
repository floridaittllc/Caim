// Lexicon.swift
// The built-in English word list, rough frequency table, and a hand-curated
// map of very common misspellings. Pure Swift — no Foundation.
//
// The word list is intentionally compact but covers the vocabulary used by the
// test suite and typical short messages. Consumers can supply their own,
// larger dictionary via `GrammarChecker(dictionary:)`.

public enum Lexicon {
    /// Most common English words in *descending* frequency order. Their index
    /// doubles as a frequency score (earlier == more common). Used to rank
    /// spelling corrections so "the" beats "thee" for the typo "teh".
    public static let commonOrdered: [String] = [
        "the", "be", "to", "of", "and", "a", "an", "in", "that", "have",
        "i", "it", "for", "not", "on", "with", "he", "as", "you", "do",
        "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
        "she", "or", "will", "my", "one", "all", "would", "there", "their", "what",
        "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
        "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
        "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
        "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
        "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
        "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
        "is", "are", "was", "were", "been", "being", "am", "has", "had", "did",
        "does", "done", "going", "gone", "made", "said", "went", "got", "getting", "let",
        "here", "too", "very", "much", "many", "more", "such", "own", "same", "few",
        "little", "big", "small", "great", "old", "high", "long", "right", "wrong", "sure",
        "hello", "world", "yes", "please", "thank", "thanks", "sorry", "help", "friend", "family",
        "home", "house", "car", "phone", "email", "message", "keyboard", "word", "sentence", "letter",
        "spell", "spelling", "grammar", "check", "correct", "mistake", "error", "text", "type", "write",
        "read", "book", "school", "student", "teacher", "learn", "study", "test", "example", "language",
        "english", "speak", "listen", "understand", "question", "answer", "problem", "solution", "idea", "plan",
        "receive", "believe", "achieve", "necessary", "separate", "definitely", "occurred", "beginning", "government", "environment",
        "restaurant", "beautiful", "tomorrow", "together", "different", "important", "interesting", "wonderful", "probably", "actually",
        "really", "always", "never", "sometimes", "often", "usually", "quickly", "slowly", "happy", "sad",
        "love", "hate", "need", "feel", "found", "keep", "kept", "run", "walk", "eat",
        "drink", "sleep", "play", "watch", "buy", "sell", "open", "close", "start", "stop",
        "cat", "dog", "apple", "orange", "hour", "honest", "honor", "umbrella", "unique", "university",
    ]

    /// Additional valid words that need to be recognized as correct but are not
    /// frequency-ranked. Merged into the main set. Contraction forms without an
    /// apostrophe are intentionally *excluded* here so the missing-apostrophe
    /// grammar rule can flag them.
    public static let extraWords: Set<String> = [
        "grammarly", "swift", "linux", "ios", "iphone", "xcode", "app", "apps",
        "cannot", "coffee", "water", "music", "movie", "money", "color", "favorite",
    ]

    /// A broad list of everyday English words (and common inflections) so the
    /// spell checker does not flag ordinary vocabulary as misspelled. Not
    /// frequency-ranked; they all receive a small baseline score. This is not
    /// an exhaustive dictionary — production use should inject a full word list
    /// via `GrammarChecker(dictionary:)` — but it covers common short-message
    /// vocabulary well enough for a realistic demo.
    public static let generalVocabulary: Set<String> = [
        "able", "above", "accept", "across", "act", "action", "add", "address",
        "afraid", "afternoon", "again", "against", "age", "ago", "agree", "air",
        "allow", "almost", "alone", "along", "already", "alright", "although",
        "amazing", "among", "amount", "animal", "another", "answer", "anyone",
        "anything", "anyway", "anywhere", "appear", "area", "arm", "around",
        "arrive", "art", "ask", "asleep", "attention", "aunt", "available",
        "away", "baby", "bad", "bag", "ball", "band", "bank", "bath", "beach",
        "bear", "beautiful", "bed", "bedroom", "beer", "before", "begin",
        "behind", "believe", "bell", "below", "beside", "best", "better",
        "between", "beyond", "bike", "bill", "bird", "birthday", "bit", "black",
        "blood", "blue", "board", "boat", "body", "bone", "border", "born",
        "both", "bottle", "bottom", "box", "boy", "brain", "branch", "brave",
        "bread", "break", "breakfast", "breath", "bridge", "bright", "bring",
        "brother", "brown", "brush", "build", "building", "burn", "bus",
        "business", "busy", "button", "cake", "call", "calm", "camera", "camp",
        "cannot", "capital", "captain", "card", "care", "careful", "carry",
        "case", "cash", "catch", "cause", "cell", "center", "central", "century",
        "certain", "chair", "chance", "change", "character", "charge", "cheap",
        "check", "cheese", "chicken", "child", "children", "choose", "church",
        "city", "class", "clean", "clear", "climb", "clock", "close", "clothes",
        "cloud", "club", "coast", "coat", "cold", "college", "column", "comfort",
        "coming", "common", "community", "company", "complete", "computer",
        "concern", "condition", "consider", "contain", "continue", "control",
        "cook", "cool", "copy", "corner", "correct", "cost", "cotton", "count",
        "country", "couple", "course", "cover", "cross", "crowd", "cry", "cup",
        "current", "customer", "cut", "dad", "dance", "danger", "dark", "date",
        "daughter", "dead", "deal", "dear", "death", "decide", "decision",
        "deep", "degree", "deliver", "depend", "describe", "desert", "design",
        "desk", "detail", "develop", "dictionary", "die", "difference",
        "difficult", "dinner", "direct", "direction", "dirty", "discover",
        "discuss", "disease", "distance", "district", "divide", "doctor",
        "dollar", "door", "double", "doubt", "down", "draw", "dream", "dress",
        "drink", "drive", "driver", "drop", "drug", "dry", "during", "duty",
        "each", "ear", "early", "earth", "east", "easy", "edge", "effect",
        "effort", "egg", "eight", "either", "electric", "else", "empty", "end",
        "enemy", "energy", "engine", "english", "enjoy", "enough", "enter",
        "entire", "equal", "escape", "especially", "evening", "event", "ever",
        "every", "everyone", "everything", "everywhere", "exact", "example",
        "except", "excited", "exercise", "exist", "expect", "expensive",
        "experience", "explain", "express", "eye", "face", "fact", "factory",
        "fail", "fair", "fall", "false", "familiar", "famous", "far", "farm",
        "fast", "father", "fault", "favor", "fear", "feature", "feed", "feel",
        "feeling", "fell", "felt", "female", "fence", "field", "fight", "figure",
        "fill", "film", "final", "finally", "find", "fine", "finger", "finish",
        "fire", "fish", "fit", "five", "fix", "flat", "floor", "flow", "flower",
        "fly", "focus", "follow", "food", "foot", "force", "foreign", "forest",
        "forever", "forget", "forgot", "form", "forward", "four", "fourth",
        "free", "fresh", "front", "fruit", "full", "fun", "funny", "future",
        "game", "garden", "gas", "gate", "gather", "general", "gentle", "gift",
        "girl", "glad", "glass", "goal", "gold", "golf", "grade", "grand",
        "grass", "gray", "green", "ground", "group", "grow", "growth", "guard",
        "guess", "guest", "guide", "gun", "guy", "hair", "half", "hall", "hand",
        "handle", "hang", "happen", "happy", "hard", "hardly", "hat", "hate",
        "head", "health", "healthy", "hear", "heard", "heart", "heat", "heavy",
        "height", "hell", "hi", "hide", "hill", "history", "hit", "hold", "hole",
        "holiday", "hope", "horse", "hospital", "hot", "hotel", "hour", "huge",
        "human", "hundred", "hungry", "hunt", "hurry", "hurt", "husband", "ice",
        "idea", "image", "imagine", "impossible", "improve", "include",
        "increase", "indeed", "industry", "inside", "instead", "interest",
        "internet", "involve", "island", "issue", "item", "job", "join", "joke",
        "journey", "joy", "judge", "jump", "just", "keep", "key", "kid", "kill",
        "kind", "king", "kitchen", "knee", "knew", "knife", "knock", "know",
        "knowledge", "known", "lack", "ladder", "lady", "lake", "land", "large",
        "last", "late", "later", "laugh", "law", "lay", "lead", "leader", "leaf",
        "learn", "least", "leave", "led", "left", "leg", "length", "less",
        "lesson", "level", "lie", "life", "lift", "light", "line", "lip", "list",
        "listen", "live", "living", "load", "local", "lock", "lonely", "long",
        "loose", "lose", "loss", "lost", "lot", "loud", "low", "luck", "lucky",
        "lunch", "machine", "mad", "magazine", "mail", "main", "major", "male",
        "mall", "manage", "manager", "map", "march", "mark", "market",
        "marriage", "married", "marry", "mass", "master", "match", "material",
        "matter", "may", "maybe", "meal", "mean", "meaning", "meat", "medical",
        "medicine", "meet", "meeting", "member", "memory", "mention", "menu",
        "mess", "metal", "meter", "method", "middle", "might", "mile", "milk",
        "million", "mind", "mine", "minute", "mirror", "miss", "mistake", "mix",
        "model", "modern", "mom", "moment", "monday", "month", "moon", "moral",
        "morning", "mother", "motion", "mount", "mountain", "mouth", "move",
        "movement", "movie", "music", "must", "myself", "nail", "name", "nation",
        "national", "native", "natural", "nature", "near", "nearly", "neck",
        "need", "needs", "neighbor", "neither", "nervous", "network", "news",
        "newspaper", "next", "nice", "night", "nine", "nobody", "noise", "none",
        "noon", "normal", "north", "nose", "note", "nothing", "notice", "novel",
        "number", "nurse", "object", "ocean", "offer", "office", "officer",
        "official", "oil", "okay", "once", "onto", "operation", "opinion",
        "opportunity", "opposite", "option", "orange", "order", "ordinary",
        "organization", "original", "outside", "oven", "owner", "page", "pain",
        "paint", "pair", "palace", "pale", "pan", "paper", "parent", "park",
        "part", "particular", "partner", "party", "pass", "passenger", "past",
        "path", "patient", "pattern", "pay", "peace", "pen", "pencil", "people",
        "perfect", "perhaps", "period", "person", "personal", "phone", "photo",
        "physical", "piano", "pick", "picture", "piece", "pig", "pink", "pipe",
        "place", "plane", "planet", "plant", "plastic", "plate", "play",
        "player", "pleasant", "please", "pleasure", "plenty", "pocket", "poem",
        "point", "police", "policy", "polite", "political", "pool", "poor",
        "popular", "population", "position", "positive", "possible", "post",
        "pot", "potato", "pound", "power", "practice", "prepare", "present",
        "president", "press", "pressure", "pretty", "prevent", "price", "pride",
        "primary", "prince", "print", "prison", "private", "prize", "probably",
        "problem", "process", "produce", "product", "professor", "program",
        "progress", "project", "promise", "proper", "protect", "proud", "prove",
        "provide", "public", "pull", "pupil", "pure", "purple", "purpose",
        "push", "quality", "quarter", "queen", "question", "quick", "quiet",
        "quite", "race", "radio", "railway", "rain", "raise", "range", "rare",
        "rate", "rather", "reach", "reaction", "read", "ready", "real", "reason",
        "receive", "recent", "recognize", "record", "red", "reduce", "refer",
        "reflect", "refuse", "regard", "region", "regular", "relate",
        "relationship", "release", "remain", "remember", "remove", "repeat",
        "replace", "reply", "report", "represent", "request", "require",
        "research", "respect", "responsible", "rest", "restaurant", "result",
        "results", "return", "reveal", "rich", "ride", "ring", "rise", "risk",
        "river", "road", "rock", "role", "roll", "roof", "room", "root", "rope",
        "rose", "rough", "round", "route", "royal", "rubber", "rude", "rule",
        "run", "rush", "sad", "safe", "safety", "sail", "salt", "same", "sand",
        "sat", "satisfy", "save", "scale", "scared", "scene", "school",
        "science", "score", "screen", "sea", "search", "season", "seat",
        "second", "secret", "section", "seem", "seen", "self", "sell", "send",
        "senior", "sense", "sentence", "separate", "series", "serious", "serve",
        "service", "set", "settle", "seven", "several", "shadow", "shake",
        "shall", "shape", "share", "sharp", "sheep", "sheet", "shelf", "shell",
        "shine", "ship", "shirt", "shock", "shoe", "shoot", "shop", "shore",
        "short", "shot", "should", "shoulder", "shout", "show", "shower", "shut",
        "sick", "side", "sight", "sign", "signal", "silence", "silent", "silly",
        "silver", "similar", "simple", "since", "sing", "single", "sink",
        "sister", "sit", "site", "situation", "six", "size", "skill", "skin",
        "sky", "sleep", "slow", "smart", "smell", "smile", "smoke", "smooth",
        "snow", "soap", "social", "society", "sock", "soft", "soil", "soldier",
        "solid", "solve", "someone", "something", "sometimes", "somewhere",
        "son", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "south",
        "space", "speak", "special", "speech", "speed", "spell", "spend",
        "spirit", "spoke", "spoon", "sport", "spot", "spread", "spring",
        "square", "stage", "stair", "stamp", "stand", "standard", "star",
        "start", "state", "station", "stay", "steal", "steel", "step", "stick",
        "still", "stone", "stood", "stop", "store", "storm", "story", "straight",
        "strange", "street", "strength", "stress", "strike", "strong",
        "structure", "struggle", "student", "study", "stuff", "stupid", "style",
        "subject", "succeed", "success", "such", "sudden", "suffer", "sugar",
        "suggest", "suit", "summer", "sun", "supper", "supply", "support",
        "suppose", "sure", "surface", "surprise", "surround", "survive",
        "sweet", "swim", "system", "table", "tail", "talk", "tall", "taste",
        "tax", "taxi", "tea", "teach", "teacher", "team", "tear", "teeth",
        "telephone", "television", "tell", "temperature", "ten", "term",
        "terrible", "test", "than", "thank", "thanks", "theater", "themselves",
        "thick", "thin", "thing", "third", "thirty", "though", "thought",
        "thousand", "thread", "three", "throat", "through", "throw", "thumb",
        "thursday", "ticket", "tie", "till", "time", "tiny", "tip", "tired",
        "title", "today", "toe", "together", "told", "tomorrow", "tone",
        "tongue", "tonight", "too", "tool", "tooth", "top", "topic", "total",
        "touch", "tough", "tour", "toward", "tower", "town", "toy", "track",
        "trade", "traffic", "train", "training", "travel", "treat", "tree",
        "trip", "trouble", "truck", "true", "trust", "truth", "try", "tube",
        "turn", "twelve", "twenty", "twice", "type", "ugly", "uncle", "under",
        "understand", "unit", "universe", "university", "unless", "until",
        "unusual", "upon", "upper", "usual", "usually", "valley", "value",
        "various", "vegetable", "vehicle", "very", "victim", "video", "view",
        "village", "visit", "visitor", "voice", "vote", "wait", "wake", "walk",
        "wall", "want", "war", "warm", "warn", "wash", "waste", "watch", "water",
        "wave", "way", "weak", "wealth", "weapon", "wear", "weather", "wedding",
        "week", "weekend", "weigh", "weight", "welcome", "west", "wet", "wheel",
        "while", "white", "whole", "whom", "whose", "wide", "wife", "wild",
        "will", "win", "wind", "window", "wine", "wing", "winter", "wire",
        "wise", "wish", "within", "without", "woman", "women", "wonder",
        "wonderful", "wood", "wooden", "word", "worry", "worse", "worst",
        "worth", "would", "wound", "write", "writer", "wrong", "yard", "year",
        "yellow", "yesterday", "yet", "young", "yourself", "youth", "zero",
    ]

    /// The full set of recognized words (lowercased).
    public static let words: Set<String> = {
        var set = Set(commonOrdered)
        set.formUnion(extraWords)
        set.formUnion(generalVocabulary)
        return set
    }()

    /// word -> frequency score. Higher is more common. Words from the ordered
    /// list get a score based on their position; everything else gets a small
    /// baseline so it is still considered valid but ranks below common words.
    public static let frequency: [String: Int] = {
        var freq: [String: Int] = [:]
        let n = commonOrdered.count
        for (i, w) in commonOrdered.enumerated() {
            freq[w] = n - i // first word gets the highest score
        }
        for w in extraWords where freq[w] == nil {
            freq[w] = 1
        }
        return freq
    }()

    /// Very common misspellings mapped directly to their correction. These are
    /// applied with high confidence (they are almost never intentional).
    public static let commonMisspellings: [String: String] = [
        "teh": "the",
        "adn": "and",
        "hte": "the",
        "recieve": "receive",
        "recieved": "received",
        "beleive": "believe",
        "beleived": "believed",
        "seperate": "separate",
        "definately": "definitely",
        "definatly": "definitely",
        "occured": "occurred",
        "occurence": "occurrence",
        "untill": "until",
        "wich": "which",
        "becuase": "because",
        "becasue": "because",
        "thier": "their",
        "freind": "friend",
        "wierd": "weird",
        "acheive": "achieve",
        "achive": "achieve",
        "neccessary": "necessary",
        "necesary": "necessary",
        "enviroment": "environment",
        "goverment": "government",
        "begining": "beginning",
        "tommorow": "tomorrow",
        "tommorrow": "tomorrow",
        "restaraunt": "restaurant",
        "alot": "a lot",
        "beutiful": "beautiful",
        "wonderfull": "wonderful",
        "helo": "hello",
        "helllo": "hello",
        "thanx": "thanks",
        "thx": "thanks",
    ]

    /// Contractions written without their apostrophe, mapped to the correct
    /// form. Detected by the missing-apostrophe grammar rule (category
    /// `.punctuation`) rather than by the spell checker.
    public static let missingApostrophe: [String: String] = [
        "cant": "can't",
        "wont": "won't",
        "dont": "don't",
        "doesnt": "doesn't",
        "didnt": "didn't",
        "isnt": "isn't",
        "arent": "aren't",
        "wasnt": "wasn't",
        "werent": "weren't",
        "wouldnt": "wouldn't",
        "couldnt": "couldn't",
        "shouldnt": "shouldn't",
        "hasnt": "hasn't",
        "havent": "haven't",
        "hadnt": "hadn't",
        "im": "I'm",
        "ive": "I've",
        "ill": "I'll",
        "id": "I'd",
        "youre": "you're",
        "youll": "you'll",
        "youve": "you've",
        "theyre": "they're",
        "theyll": "they'll",
        "theyve": "they've",
        "weve": "we've",
        "hes": "he's",
        "shes": "she's",
        "thats": "that's",
        "whats": "what's",
        "lets": "let's",
        "heres": "here's",
        "theres": "there's",
    ]

    /// Words that are always considered correctly spelled regardless of case
    /// and should never be "corrected" (short function words, single letters).
    public static let neverFlag: Set<String> = ["a", "i", "o"]
}
