"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSimulation = testSimulation;
const index_1 = require("./core/simulation-engine/index");
const index_2 = require("./core/simulation-engine/index");
const index_3 = require("./core/simulation-engine/index");
const shared_1 = require("@el-farol/shared");
/**
 * Test script to run a simulation with different agent types
 */
async function testSimulation() {
    console.log('starting test simulation\n');
    // Create simulation engine
    const engine = new index_1.SimulationEngine();
    const sandbox = new index_3.AgentSandbox();
    // create game
    const game = engine.createGame({
        name: 'Test Simulation',
        description: 'Testing different agent strategies',
        config: {
            capacity: 60, // Bar capacity
            numAgents: 100,
            numRounds: 50,
            benefitRules: {
                positiveMultiplier: 1,
                negativeMultiplier: 1
            }
        }
    });
    console.log(`📊 Game created: ${game.getName()}`);
    console.log(`   Capacity: ${game.getConfig().capacity}`);
    console.log(`   Agents: ${game.getConfig().numAgents}`);
    console.log(`   Rounds: ${game.getConfig().numRounds}\n`);
    // Create different types of agents
    const agentConfigs = [
        // Random agents (30 agents)
        ...Array.from({ length: 30 }, () => ({
            name: 'Random Agent',
            type: shared_1.AgentType.BUILT_IN,
            builtInType: shared_1.BuiltInAgentType.RANDOM
        })),
        // Threshold agents (25 agents)
        ...Array.from({ length: 25 }, () => ({
            name: 'Threshold Agent',
            type: shared_1.AgentType.BUILT_IN,
            builtInType: shared_1.BuiltInAgentType.THRESHOLD,
            parameters: { threshold: 0.6, goProbability: 0.7 }
        })),
        // Moving Average agents (25 agents)
        ...Array.from({ length: 25 }, () => ({
            name: 'Moving Average Agent',
            type: shared_1.AgentType.BUILT_IN,
            builtInType: shared_1.BuiltInAgentType.MOVING_AVERAGE,
            parameters: { windowSize: 5, threshold: 0.65 }
        })),
        // Adaptive agents (20 agents)
        ...Array.from({ length: 20 }, () => ({
            name: 'Adaptive Agent',
            type: shared_1.AgentType.BUILT_IN,
            builtInType: shared_1.BuiltInAgentType.ADAPTIVE,
            parameters: { initialThreshold: 0.6, adaptationRate: 0.05 }
        }))
    ];
    console.log('🤖 Creating agents...');
    console.log(`   - ${agentConfigs.filter(a => a.builtInType === shared_1.BuiltInAgentType.RANDOM).length} Random agents`);
    console.log(`   - ${agentConfigs.filter(a => a.builtInType === shared_1.BuiltInAgentType.THRESHOLD).length} Threshold agents`);
    console.log(`   - ${agentConfigs.filter(a => a.builtInType === shared_1.BuiltInAgentType.MOVING_AVERAGE).length} Moving Average agents`);
    console.log(`   - ${agentConfigs.filter(a => a.builtInType === shared_1.BuiltInAgentType.ADAPTIVE).length} Adaptive agents\n`);
    // Create factory with game ID as seed so each agent gets independent RNG
    const factory = new index_2.AgentFactory(sandbox, undefined, game.getId());
    // Add agents to game
    // Create initial context for agents (empty history at start)
    const initialContext = {
        attendanceHistory: [],
        capacity: game.getConfig().capacity,
        roundNumber: 0,
        helpers: {
            sum: (arr) => arr.reduce((a, b) => a + b, 0),
            average: (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
            min: (arr) => Math.min(...arr),
            max: (arr) => Math.max(...arr),
            last: (arr) => arr[arr.length - 1]
        }
    };
    for (let i = 0; i < agentConfigs.length; i++) {
        const agent = factory.createAgent(agentConfigs[i], initialContext, i);
        game.addAgent(agent);
    }
    // Start the game
    game.start();
    console.log('✅ Game started!\n');
    // Run simulation
    console.log('🎮 Running simulation...\n');
    const startTime = Date.now();
    try {
        const result = engine.runSimulation(game.getId(), 50);
        const duration = Date.now() - startTime;
        console.log('📈 Simulation Results:\n');
        console.log(`   Status: ${result.status}`);
        console.log(`   Total Rounds: ${result.totalRounds}`);
        console.log(`   Duration: ${duration}ms\n`);
        // Print final stats
        const stats = result.finalStats;
        console.log('📊 Final Statistics:\n');
        console.log(`   Total Benefit: ${stats.totalBenefit.toFixed(2)}`);
        console.log(`   Average Benefit: ${stats.averageBenefit.toFixed(2)}`);
        console.log(`   Average Attendance: ${stats.averageAttendance.toFixed(2)}`);
        console.log(`   Attendance Std Dev: ${stats.attendanceStdDev.toFixed(2)}`);
        console.log(`   Optimal Benefit: ${stats.optimalBenefit}`);
        console.log(`   Efficiency: ${(stats.efficiency * 100).toFixed(2)}%`);
        console.log(`   Rounds Within Capacity: ${stats.roundsWithinCapacity}/${stats.totalRounds}`);
        console.log(`   Rounds Over Capacity: ${stats.roundsOverCapacity}/${stats.totalRounds}\n`);
        // Print first 10 and last 10 rounds
        console.log('📋 Round-by-Round Results:\n');
        console.log('   First 10 rounds:');
        result.rounds.slice(0, 10).forEach((round) => {
            const status = round.attendance <= game.getConfig().capacity ? '✅' : '❌';
            console.log(`   Round ${round.roundNumber}: ${round.attendance} attendees ${status} (benefit: ${round.totalBenefit.toFixed(2)})`);
        });
        if (result.rounds.length > 20) {
            console.log('\n   ...\n');
        }
        console.log('\n   Last 10 rounds:');
        result.rounds.slice(-10).forEach((round) => {
            const status = round.attendance <= game.getConfig().capacity ? '✅' : '❌';
            console.log(`   Round ${round.roundNumber}: ${round.attendance} attendees ${status} (benefit: ${round.totalBenefit.toFixed(2)})`);
        });
        // Print attendance history chart (ASCII)
        console.log('\n📊 Attendance Over Time:\n');
        const maxAttendance = Math.max(...stats.attendanceHistory);
        const capacity = game.getConfig().capacity;
        stats.attendanceHistory.forEach((attendance, idx) => {
            const barLength = Math.round((attendance / maxAttendance) * 50);
            const bar = '█'.repeat(barLength);
            const status = attendance <= capacity ? '✅' : '❌';
            console.log(`   Round ${(idx + 1).toString().padStart(2, ' ')}: ${bar} ${attendance} ${status}`);
        });
        console.log(`\n   Capacity line: ${'─'.repeat(50)} ${capacity}`);
        console.log('\n✅ Simulation completed successfully!\n');
    }
    catch (error) {
        console.error('❌ Simulation error:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
    }
}
// Run the test
if (require.main === module) {
    testSimulation().catch(console.error);
}
