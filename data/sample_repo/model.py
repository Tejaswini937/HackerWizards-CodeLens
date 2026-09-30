"""Model training and inference, called after data preprocessing."""


class SimpleLinearModel:
    """A minimal linear model used to keep this sample repo dependency-free."""

    def __init__(self):
        self.weights = None
        self.bias = 0.0


def train_model(features, labels, learning_rate=0.01, epochs=50):
    """
    Train a simple linear model on preprocessed features and labels.

    Runs plain gradient descent for the given number of epochs and
    returns the fitted model. Expects features as a list of numeric
    lists and labels as a matching list of floats.
    """
    model = SimpleLinearModel()
    n_features = len(features[0]) if features else 0
    model.weights = [0.0] * n_features

    for _ in range(epochs):
        for row, label in zip(features, labels):
            prediction = sum(w * x for w, x in zip(model.weights, row)) + model.bias
            error = prediction - label
            model.weights = [
                w - learning_rate * error * x for w, x in zip(model.weights, row)
            ]
            model.bias -= learning_rate * error

    return model


def predict(model, features):
    """
    Run inference with a trained model over a batch of feature rows.

    Returns a list of predicted values, one per input row, computed as
    the dot product of the model weights with each row plus the bias.
    """
    predictions = []
    for row in features:
        value = sum(w * x for w, x in zip(model.weights, row)) + model.bias
        predictions.append(value)
    return predictions
