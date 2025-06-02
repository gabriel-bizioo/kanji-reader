import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TestPDF = () => {
  let pdfStatus = 'Unknown';
  
  try {
    const Pdf = require('react-native-pdf');
    pdfStatus = 'Available';
  } catch (error) {
    pdfStatus = `Error: ${error.message}`;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>PDF Module Status: {pdfStatus}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: 'white', fontSize: 16 },
});

export default TestPDF;
