const str = 'input.tsx'
const ends_with_unit_regex = /(?:px|em|ex|ch|rem|vw|vh|vmin|vmax|%|cm|mm|in|pt|pc)$/i
// console.log(str.replace(/(\.ts|\.tsx)$/, '.js'))
console.log('ends_with_unit_regex', ends_with_unit_regex.test('1vh'))