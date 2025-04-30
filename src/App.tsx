import './App.css'
import TextField from '@mui/material/TextField';
import { Button, Checkbox } from '@mui/material';
import { useState, useEffect } from 'react';

import { generateText } from 'ai';
import { createOpenAI } from "@ai-sdk/openai"

const myOpenAi = createOpenAI({ apiKey: '<insert key here>'})

class ChineseSentence {
  constructor(
    public characters: string,
    public pinyin: string,
    public english: string
  ) {}
}

function App() {
  let words = 'default';

  const [results, setResults] = useState(['']);
  const [loading, setLoading] = useState(false);

  const [fileContent, setFileContent] = useState('');
  const [selectedSentences, setSelectedSentences] = useState<ChineseSentence[]>([]);

  // trying to load all known words from file
  useEffect(() => {
    const loadFile = async () => {
      try {
        const response = await fetch('/import.txt'); // File located in the public folder
        if (response.ok) {
          const text = await response.text();
          console.log(text);
          setFileContent(removeDuplicateChars((text)));

          console.log(fileContent);
        } else {
          console.error('Failed to load file');
        }
      } catch (error) {
        console.error('Error loading file:', error);
      }
    };

    loadFile();  // Call the function to load the file
  }, []);

  const removeDuplicateChars = (str: string) => {
    return Array.from(new Set(str)).join('');
  };

  const fetchText = async () => {
    const wordsByLine = words.split('\n');
    let resultsArray: string[] = [];
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    
    setLoading(true);
    try {
      for (const word of wordsByLine) {
        const { text } = await generateText({
          model: myOpenAi('gpt-4o-mini'),
          prompt: `
            Generate 5 Chinese example sentences using this word: ${word}.
            Please provide characters, pinyin, and english translation.
            Keep the sentences simple, vary them in length.
            To make it interesting, the sentences should sound like they come from a novel about <fill in blank>.
            Dont use flowery language, the sentences should be short and simple.
            Please use the authorial voice of a young person, writing for young audiences today. Should not be archaic sounding.
            You also do not need to number the sentences.
            The sentences should be a mix of short and long ones.
          `,
        });
        const textArray = text.split('\n');
        console.log('split text', textArray);
        resultsArray = resultsArray.concat(textArray);

        console.log(`Completed for: ${word}`);
  
        //await sleep(2000);
      }
      
      console.log(resultsArray);
      
      setResults(adjustResultsArray(resultsArray));
    } catch (error) {
      console.error('Error generating text:', error);
      setResults(['Failed to generate text.']);
    } finally {
      setLoading(false);
      alert('done!!');
    }
  };

  const adjustResultsArray = (results: string[]) => {
    const cleanedArray = results.filter(str => str.trim() !== "");
    const processedSentences = [];
    for (let i = 0; i < cleanedArray.length; i++) {
      console.log(cleanedArray[i]);
      if (i % 3 === 1) {  // Pinyin sentence
        console.log('in here!', cleanedArray[i + 1]);
        const combined = `${cleanedArray[i].trim()}\n${cleanedArray[i + 1].trim()}`;  // Combine with a newline
        processedSentences.push(combined);
        i++;  // Skip the next index (English sentence)
      } else {
        processedSentences.push(cleanedArray[i].trim());  // Chinese character sentence
      }
    }
    console.log(processedSentences);
    return processedSentences;
  };


  // first thing to add: is there a way to add copy to clipboard buttons for first the
  // chars then the pinyin and english
  // working on this: now i have it so that everything is in an array
  // need to somehow group the pinyin and english together
  // then add the button and pass in the text for each item rendered...
  // DONE

  // second thing to add import list of all known words and for all the generated sentences
  // display unknown characters in red
  // this will help me quickly determine which sentences to grab
  // maybe could even start grabbing sentences without reading them
  // DONE

  // oohh ok could be cool if it wraps the new word in html to highlight it
  // so then all i have to do is copy it to anki i dont even have to read it yeahhhh
  /////


  // ok so what do i want?
  // i need to add checkboxes
  // then it should take all of the checkboxed sentences and turn them into cards
  // and then download them as a text file...
  const exportCards = () => {
    const cardData = selectedSentences.map(sentence => 
      `${sentence.characters}\t${sentence.pinyin}<br>${sentence.english}`
    ).join('\n');

    const todaysDate = new Date().toISOString().split('T')[0];

    const blob = new Blob([cardData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anki_cards_${todaysDate}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightNewChars = (sentence: string, index: number) => {
    if (index % 2 == 0) {
      const chineseCharRegex = /[\u4e00-\u9fff]/;
      return sentence
      .split("")  // Split the sentence into individual characters
      .map(char => {
        if (chineseCharRegex.test(char) && !fileContent.includes(char)) {
          // Wrap the character in a span with a red color if it's not in the master list
          return `<span style="color: red;">${char}</span>`;
        }
        return char;  // Keep the character unchanged if it's in the master list
      })
      .join("");  // Join the characters back into a single string
    }
    return sentence;
  };

  const handleCheckboxChange = (index: number) => {
    const sentencePair = new ChineseSentence(
      results[index],
      results[index + 1].split('\n')[0],  // Extract pinyin
      results[index + 1].split('\n')[1]   // Extract English
    );
    setSelectedSentences(prevSelected => {
      if (prevSelected.some(sentence => sentence.characters === sentencePair.characters)) {
        return prevSelected.filter(sentence => sentence.characters !== sentencePair.characters);
      } else {
        return [...prevSelected, sentencePair];
      }
    });
  };

  return (
    <>
      <div className='main-content'>
        <div className='input-area'>
          <TextField
          id="outlined-multiline-flexible"
          label="Multiline"
          multiline
          rows={20}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            words = event.target.value;
          }}/>
          <Button onClick={fetchText} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Text'}
          </Button>
          <div>
            <Button onClick={exportCards}>Export Cards</Button>
          </div>
          <div>{selectedSentences.map((item, index) => (
            <div key={index}>
              <p>{item.characters}</p>
              <p>{item.pinyin}</p>
              <p>{item.english}</p>
            </div>
          ))}</div>  
        </div>
        <div className='result-area'>
          <div style={{ marginTop: '20px' }}>
            <h2>Result:</h2>
            <div id="results-text" style={{ whiteSpace: 'pre-wrap', padding: '20px', border: '1px solid #ddd' }}>
              {results.map((item, index) => (
                <div style={{whiteSpace: 'pre-wrap'}} key={index}>
                  <Button onClick={() => {
                    //alert('clicked');
                    navigator.clipboard.writeText(item);
                  }}>
                    COPY
                  </Button>
                  {(index === 0 || index % 2 === 0) && (
                    <Checkbox onChange={() => handleCheckboxChange(index)}/>
                  )}
                  <p dangerouslySetInnerHTML={{ __html: highlightNewChars(item, index) }} />
                </div>
              ))}
            </div>
          </div> 
        </div>
      </div>
    </>
  )
}

export default App
