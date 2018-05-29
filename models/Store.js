const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'please enter a store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply and author'
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// define our indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({ location: '2dsphere' });

storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')){
        next();
        return;
    }

    this.slug = slug(this.name);
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storeWithSlug = await this.constructor.find({ slug: slugRegEx});
    if (storeWithSlug.length) {
        this.slug = `${this.slug}-${storeWithSlug.length + 1}`;
    }
    next();
});

storeSchema.statics.getTagList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
}

storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        // lookup stores and populate  their reviews 
        // mongoose change the model name from Review to reviews (lowercase and add an s at the end)
        { $lookup: { 
            from: 'reviews', 
            localField: '_id', 
            foreignField: 'store', 
            as: 'reviews' 
        } }, 
        // filter for stores that have at least 2 reviews
        { $match: {'reviews.1': { $exists: true} } },
        // add avrage review field 
        // on mongodb 3.4 they added $addFields and dont have to use project that makes the rest of the data gone
        // { $addFields: {
        //     avrageRating: { $avg: '$reviews.rating' }
        // } }
        { $project: {
            photo: '$$ROOT.photo',
            name: '$$ROOT.name',
            reviews: '$$ROOT.reviews',
            slug: '$$ROOT.slug',
            avrageRating: { $avg: '$reviews.rating' }
        } },
        // sort by the new avrage review field
        { $sort: { avrageRating: -1 } },
        // limit to 10 stores
        { $limit: 10 }
    ]);
}

function autoPopulate(next) {
    this.populate('reviews');
    next();
}

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);


// find reviews where the store _id property === reviews store property
storeSchema.virtual('reviews', {
    ref: 'Review', // what modul to link?
    localField: '_id', // which field in our store?
    foreignField: 'store' // which field in our review?
});

module.exports = mongoose.model('Store', storeSchema);