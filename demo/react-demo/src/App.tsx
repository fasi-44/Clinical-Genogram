import React, { useRef, useEffect } from 'react';
import { defineCustomElements } from 'clinical-genogram/loader';

defineCustomElements();

const sampleData = {
  version: '1.0.0',
  persons: [
    { id: 'p1', fullName: 'John Smith', gender: 'male', type: 'standard', isDeceased: false, isProband: true, conditions: [] },
    { id: 'p2', fullName: 'Jane Smith', gender: 'female', type: 'standard', isDeceased: false, isProband: false, conditions: [] },
  ],
  relationships: [
    { id: 'r1', type: 'marriage', person1Id: 'p1', person2Id: 'p2', childrenIds: [], consanguinity: 'none' },
  ],
};

export default function App() {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.setData(sampleData);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <clinical-genogram ref={ref} show-toolbar={true} show-legend={true} />
    </div>
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'clinical-genogram': any;
    }
  }
}