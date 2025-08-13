// MongoDB initialization script for Roommate Finder App

// Switch to the application database
db = db.getSiblingDB('roommate_app');

// Create collections with validation schemas
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'telegram_id', 'first_name', 'age', 'location'],
            properties: {
                id: { bsonType: 'string' },
                telegram_id: { bsonType: ['int', 'long'] },
                first_name: { bsonType: 'string' },
                age: { bsonType: 'int', minimum: 18, maximum: 100 },

                location: {
                    bsonType: 'object',
                    required: ['type', 'coordinates'],
                    properties: {
                        type: { enum: ['Point'] },
                        coordinates: {
                            bsonType: 'array',
                            minItems: 2,
                            maxItems: 2,
                            items: { bsonType: 'double' }
                        }
                    }
                }
            }
        }
    }
});

db.createCollection('properties', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'title', 'price', 'location'],
            properties: {
                id: { bsonType: 'string' },
                title: { bsonType: 'string' },
                price: { bsonType: 'int', minimum: 0 },
                location: {
                    bsonType: 'object',
                    required: ['type', 'coordinates'],
                    properties: {
                        type: { enum: ['Point'] },
                        coordinates: {
                            bsonType: 'array',
                            minItems: 2,
                            maxItems: 2,
                            items: { bsonType: 'double' }
                        }
                    }
                }
            }
        }
    }
});

db.createCollection('likes');
db.createCollection('matches');

// Create indexes for better performance
db.users.createIndex({ 'location': '2dsphere' });
db.users.createIndex({ 'telegram_id': 1 }, { unique: true });
db.users.createIndex({ 'created_at': 1 });

db.properties.createIndex({ 'location': '2dsphere' });
db.properties.createIndex({ 'created_at': 1 });
db.properties.createIndex({ 'price': 1 });
db.properties.createIndex({ 'metro_station': 1 });

db.likes.createIndex({ 'user_id': 1, 'target_id': 1, 'target_type': 1 }, { unique: true });
db.likes.createIndex({ 'user_id': 1 });
db.likes.createIndex({ 'target_id': 1 });

db.matches.createIndex({ 'user1_id': 1, 'user2_id': 1 }, { unique: true });
db.matches.createIndex({ 'user1_id': 1 });
db.matches.createIndex({ 'user2_id': 1 });

print('MongoDB initialization completed for Roommate Finder App');