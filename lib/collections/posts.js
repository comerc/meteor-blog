Posts = new Mongo.Collection('posts');

Posts.allow({
  update: function(userId, post) { return ownsDocument(userId, post); },
  remove: function(userId, post) { return ownsDocument(userId, post); },
});

Posts.deny({
  update: function(userId, post, fieldNames) {
    // may only edit the following fields:
    return (_.without(fieldNames, 'postTitle', 'postCaption', 'postContent').length > 0);
  }
});

Posts.deny({
  update: function(userId, post, fieldNames, modifier) {
    var errors = validatePost(modifier.$set);
    return errors.postTitle || errors.postCaption || errors.postContent;
  }
});

validatePost = function (post) {
  var errors = {};

  if (!post.postTitle)
    errors.postTitle = "Please fill in a name for your post";

  if (!post.postCaption)
    errors.postCaption =  "Please make a caption for your post";

  if (!post.postContent)
    errors.postContent =  "Please write your post";

  return errors;
};

Meteor.methods({
  postInsert: function(postAttributes) {
    check(this.userId, String);
    check(postAttributes, {
      postTitle: String,
      postCaption: String,
      postContent: String
    });

    var errors = validatePost(postAttributes);
    if (errors.postTitle || errors.postCaption || errors.postContent)
      throw new Meteor.Error('invalid-post', "You must set a title caption and write your post");


    var user = Meteor.user();
    var post = _.extend(postAttributes, {
      userId: user._id,
      author: user.username,
      submitted: new Date(),
      commentsCount: 0,
      upvoters: [],
      votes: 0
    });

    var postId = Posts.insert(post);

    return {
      _id: postId
    };
  },

  upvote: function(postId) {
    check(this.userId, String);
    check(postId, String);

    var affected = Posts.update({
      _id: postId,
      upvoters: {$ne: this.userId}
    }, {
      $addToSet: {upvoters: this.userId},
      $inc: {votes: 1}
    });

    if (! affected)
      throw new Meteor.Error('invalid', "You weren't able to upvote that post");
  }
});
