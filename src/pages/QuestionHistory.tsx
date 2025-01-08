import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Experiment, ExperimentResult } from '../types/experiment';
import { loadAllExperiments } from '../data/experimentLoader';
import { formatMetricValue } from '../utils/formatters';

interface QuestionData {
  question: string;
  answers: {
    experimentName: string;
    experimentDescription: string;
    answer: string;
    metrics: {
      correctness: number;
      correctness_weighted: number;
      faithfulness: number;
    };
  }[];
}

export default function QuestionHistory() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'question', direction: 'ascending' });

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setLoading(true);
        
        // Załaduj wszystkie eksperymenty
        const experiments = await loadAllExperiments();
        
        // Zbierz wszystkie unikalne pytania
        const questionsMap = new Map<string, QuestionData>();
        
        experiments.forEach(experiment => {
          experiment.results.forEach(result => {
            if (!questionsMap.has(result.prompt)) {
              questionsMap.set(result.prompt, {
                question: result.prompt,
                answers: []
              });
            }
            
            const questionData = questionsMap.get(result.prompt)!;
            questionData.answers.push({
              experimentName: experiment.name,
              experimentDescription: experiment.description,
              answer: result.response,
              metrics: {
                correctness: result.correctness,
                correctness_weighted: result.correctness_weighted,
                faithfulness: result.faithfulness
              }
            });
          });
        });
        
        setQuestions(Array.from(questionsMap.values()));
        setLoading(false);
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load questions');
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedQuestions = () => {
    const filteredQuestions = searchTerm
      ? questions.filter(q =>
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.answers.some(a => a.answer.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      : questions;

    return [...filteredQuestions].sort((a, b) => {
      if (sortConfig.key === 'question') {
        return sortConfig.direction === 'ascending'
          ? a.question.localeCompare(b.question)
          : b.question.localeCompare(a.question);
      }
      return 0;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        {error}
      </div>
    );
  }

  const sortedQuestions = getSortedQuestions();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Question History</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search questions and answers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div className="space-y-8">
        {sortedQuestions.map((questionData, index) => (
          <div key={index} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Question:</h2>
              <div className="text-gray-700">{questionData.question}</div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Answers:</h3>
              <div className="space-y-4">
                {questionData.answers.map((answer, answerIndex) => (
                  <div key={answerIndex} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link
                        to={`/experiment/${answer.experimentName}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {answer.experimentDescription}
                      </Link>
                      <div className="flex space-x-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Correctness</div>
                          <div className="font-semibold text-blue-600">
                            {formatMetricValue(answer.metrics.correctness)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Weighted</div>
                          <div className="font-semibold text-green-600">
                            {formatMetricValue(answer.metrics.correctness_weighted)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-500">Faithfulness</div>
                          <div className="font-semibold text-purple-600">
                            {formatMetricValue(answer.metrics.faithfulness)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-700">{answer.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
