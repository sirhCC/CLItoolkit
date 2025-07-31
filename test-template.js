// Test template engine specifically
console.log('Testing template engine fixes...');

try {
    // Direct import from compiled version
    const { AdvancedTemplateEngine } = require('./dist/test/template-engine');

    // Create engine
    const engine = new AdvancedTemplateEngine();

    // Test simple template
    console.log('Test 1: Simple variable');
    const result1 = engine.render('Hello {{name}}!', { name: 'World' });
    console.log('Result 1:', result1);

    // Test helper with quotes
    console.log('\nTest 2: Helper with quoted strings');
    const result2 = engine.render('{{colorize "Test" "red"}}', {});
    console.log('Result 2:', result2);

    // Test capitalize helper
    console.log('\nTest 3: Capitalize helper');
    const result3 = engine.render('{{capitalize name}}', { name: 'john doe' });
    console.log('Result 3:', result3);

    // Test complex template like in demo
    console.log('\nTest 4: Complex template');
    const complexTemplate = `
Name: {{capitalize name}}
Role: {{badge role "green"}}
`;

    // Register the badge helper like in demo
    engine.registerHelper('badge', (text, color = 'blue') => {
        const colors = {
            red: '\x1b[41m\x1b[37m',
            green: '\x1b[42m\x1b[37m',
            blue: '\x1b[44m\x1b[37m'
        };
        const colorCode = colors[color] || colors.blue;
        return `${colorCode} ${text} \x1b[0m`;
    });

    const result4 = engine.render(complexTemplate, {
        name: 'john doe',
        role: 'developer'
    });
    console.log('Result 4:', result4);

} catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
}

console.log('Template test completed.');
