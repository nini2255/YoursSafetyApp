import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, TouchableOpacity, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { SafeAreaView } from 'react-native-safe-area-context'

// A valid solved Sudoku grid base
const baseSolvedGrid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

// --- NEW: Function to generate a randomized puzzle with empty top row ---
const generateSudoku = () => {
    // 1. Deep copy base grid
    let newGrid = baseSolvedGrid.map(row => [...row]);

    // 2. Shuffle numbers (map 1-9 to new random 1-9)
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    const map = {};
    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n, i) => map[n] = nums[i]);

    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            newGrid[r][c] = map[newGrid[r][c]];
        }
    }

    // 3. Clear TOP ROW completely (for bypass code input)
    for(let c=0; c<9; c++) {
        newGrid[0][c] = 0;
    }

    // 4. Randomly clear other cells to make it a puzzle (e.g., ~40 more cells)
    let cellsToClear = 40;
    while(cellsToClear > 0) {
        const r = Math.floor(Math.random() * 8) + 1; // rows 1-8 (don't touch top row 0)
        const c = Math.floor(Math.random() * 9);
        if(newGrid[r][c] !== 0) {
            newGrid[r][c] = 0;
            cellsToClear--;
        }
    }
    return newGrid;
};
// -----------------------------------------------------------------------

const SudokuScreen = ({ onBypassSuccess, isEmergencyMode }) => {
  const { user } = useAuth();
  
  // Initialize with a fresh random grid every time component mounts
  const [grid, setGrid] = useState(generateSudoku); 
  
  const [bypassCode, setBypassCode] = useState('');
  const [userInput, setUserInput] = useState(Array(9).fill(''));
  const [activeCell, setActiveCell] = useState(null);
  const [bypassCodeKey, setBypassCodeKey] = useState(null);
  const cellRefs = useRef({});

  useEffect(() => {
    if (user?.email) {
      setBypassCodeKey(`@${user.email}_bypass_code`);
    }
  }, [user]);

  useEffect(() => {
    if (bypassCodeKey) {
      loadBypassCode();
    }
  }, [bypassCodeKey]);

  // OPTIONAL: Regenerate grid when screen comes into focus if you want it to change 
  // every single time they navigate back and forth, not just on first mount.
  // You'd need to import useFocusEffect from @react-navigation/native for that.

  const loadBypassCode = async () => {
    if (!bypassCodeKey) return; 
    try {
      const code = await AsyncStorage.getItem(bypassCodeKey);
      if (code) {
        setBypassCode(code);
      }
    } catch (e) {
      console.error('Failed to load bypass code', e);
    }
  };

  const handleInputChange = (text, index) => {
    const newInputs = [...userInput];
    newInputs[index] = text.replace(/[^1-9]/g, '');
    setUserInput(newInputs);

    // Check for bypass code ALWAYS if it's entered in the top row
    const enteredCode = newInputs.join('');
    if (bypassCode && enteredCode.length === bypassCode.length && enteredCode === bypassCode) {
        Alert.alert('Bypass Activated', 'Loading app...');
        onBypassSuccess();
        return;
    }
    
    if (text && index < 8) {
      cellRefs.current[`cell_${index + 1}`]?.focus();
    }
  };

  const renderCell = (row, col) => {
    const value = grid[row][col];
    // Top row (row === 0) is ALWAYS an input row now
    const isFirstRow = row === 0;

    if (isFirstRow) {
       const cellIndex = col;
       return (
        <TextInput
          style={[
            styles.cell,
            styles.inputCell,
            activeCell === cellIndex && styles.activeCell,
          ]}
          value={userInput[cellIndex]}
          onChangeText={(text) => handleInputChange(text, cellIndex)}
          onFocus={() => setActiveCell(cellIndex)}
          onBlur={() => setActiveCell(null)}
          keyboardType="number-pad"
          maxLength={1}
          ref={(input) => { cellRefs.current[`cell_${cellIndex}`] = input; }}
        />
      );
    }

    return (
      <Text style={styles.cellText}>{value !== 0 ? value : ''}</Text>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title="Sudoku" />
      <View style={styles.container}>
        <Text style={styles.title}>Sudoku</Text>
        <Text style={styles.subtitle}>Enter bypass code in the first row to unlock</Text>

        <View style={styles.grid}>
          {grid.map((row, rowIndex) => (
            <View key={rowIndex} style={[
              styles.row,
              (rowIndex + 1) % 3 === 0 && rowIndex !== 8 && styles.thickBorderBottom,
            ]}>
              {row.map((_, colIndex) => (
                <View key={colIndex} style={[
                  styles.cell,
                  (colIndex + 1) % 3 === 0 && colIndex !== 8 && styles.thickBorderRight,
                  rowIndex === 0 && styles.inputRow, // Always highlight top row
                ]}>
                  {renderCell(rowIndex, colIndex)}
                </View>
              ))}
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.keypadDismiss} onPress={() => Keyboard.dismiss()}>
          <Text style={styles.keypadDismissText}>Dismiss Keyboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F8',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  grid: {
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 40,
    height: 40,
    borderWidth: 0.5,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    backgroundColor: '#FFF8F8',
  },
  inputCell: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F87171',
    textAlign: 'center',
    padding: 0,
  },
  activeCell: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
  },
  cellText: {
    fontSize: 22,
    color: '#333',
  },
  thickBorderBottom: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
  },
  thickBorderRight: {
    borderRightWidth: 2,
    borderRightColor: '#333',
  },
  keypadDismiss: {
    marginTop: 20,
    padding: 10,
  },
  keypadDismissText: {
    fontSize: 16,
    color: '#F87171',
  },
});

export default SudokuScreen;