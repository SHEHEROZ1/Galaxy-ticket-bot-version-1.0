const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');  // Import fs module for file reading
const path = require('path');  // To resolve the path of the config file

// Load the bot token from the config.json file
const config = require(path.join(__dirname, 'config.json'));  // Use path.join to ensure proper path resolution

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ]
});

let tickets = {}; // Store tickets by channel ID

// When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Command to create a ticket
client.on('messageCreate', async (message) => {
    if (message.content === '!ticket') {
        // Check if the user already has a ticket
        const existingTicket = message.guild.channels.cache.find(
            (ch) => ch.name === `ticket-${message.author.id}`
        );

        if (existingTicket) {
            return message.reply(`You already have an open ticket: ${existingTicket}`);
        }

        // Create a new text channel for the ticket
        const category = message.guild.channels.cache.find(
            (cat) => cat.name === 'Tickets' && cat.type === 'GUILD_CATEGORY'
        );

        if (!category) {
            return message.reply('The "Tickets" category does not exist!');
        }

        // Create the ticket channel
        const ticketChannel = await message.guild.channels.create(
            `ticket-${message.author.id}`,
            {
                type: 'GUILD_TEXT',
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: message.guild.id,
                        deny: ['VIEW_CHANNEL'], // Hide from everyone
                    },
                    {
                        id: message.author.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'], // Give the user permissions
                    }
                ]
            }
        );

        // Send a message inside the ticket channel
        await ticketChannel.send(
            `Hello ${message.author.tag}, how can we assist you? A staff member will assist you soon.`
        );

        // Store ticket info
        tickets[ticketChannel.id] = message.author.id;

        // Notify the user
        message.reply(`Your ticket has been created: ${ticketChannel}`);
    }

    // Command to close the ticket
    if (message.content === '!close') {
        // Check if the message is sent in a ticket channel
        if (!tickets[message.channel.id]) {
            return message.reply('This is not a ticket channel.');
        }

        // Check if the user is the ticket owner or an admin
        if (
            message.author.id !== tickets[message.channel.id] &&
            !message.member.permissions.has('MANAGE_CHANNELS')
        ) {
            return message.reply('You do not have permission to close this ticket.');
        }

        // Send a closing message and delete the channel
        await message.channel.send('Closing your ticket in 10 seconds...');
        setTimeout(() => {
            message.channel.delete();
            delete tickets[message.channel.id]; // Remove from the tickets list
        }, 10000); // Close after 10 seconds
    }

    // Command to add a user to a ticket (Admin only)
    if (message.content.startsWith('!add') && message.member.permissions.has('MANAGE_CHANNELS')) {
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('Please mention a user to add to the ticket.');
        }

        // Check if the message is sent in a ticket channel
        if (!tickets[message.channel.id]) {
            return message.reply('This is not a ticket channel.');
        }

        // Add the member to the ticket channel
        await message.channel.permissionOverwrites.edit(member, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true
        });

        message.channel.send(`${member} has been added to the ticket.`);
    }

    // Command to remove a user from a ticket (Admin only)
    if (message.content.startsWith('!remove') && message.member.permissions.has('MANAGE_CHANNELS')) {
        const member = message.mentions.members.first();
        if (!member) {
            return message.reply('Please mention a user to remove from the ticket.');
        }

        // Check if the message is sent in a ticket channel
        if (!tickets[message.channel.id]) {
            return message.reply('This is not a ticket channel.');
        }

        // Remove the member from the ticket channel
        await message.channel.permissionOverwrites.edit(member, {
            VIEW_CHANNEL: false,
            SEND_MESSAGES: false
        });

        message.channel.send(`${member} has been removed from the ticket.`);
    }
});

// Log the bot in
client.login(config.token);  // Log in using the token from the config.json
