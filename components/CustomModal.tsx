import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

interface CustomModalProps {
  isVisible: boolean;
  onBackdropPress: () => void;
  children: React.ReactNode;
  animationIn?: "fade" | "slide";
  backdropOpacity?: number;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isVisible,
  onBackdropPress,
  children,
  animationIn = "fade",
  backdropOpacity = 0.7,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, fadeAnim]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      onRequestClose={onBackdropPress}
      animationType={animationIn === "slide" ? "slide" : "none"}
      statusBarTranslucent={true}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onBackdropPress}>
          <View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalViewWrapper}
        >
          <Animated.View
            style={[styles.contentContainer, { opacity: fadeAnim }]}
          >
            <TouchableWithoutFeedback>
              <View style={styles.contentInner}>{children}</View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: "relative",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 1,
  },
  modalViewWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  contentContainer: {
    width: "85%",
    maxWidth: 400,
    zIndex: 3,
    borderRadius: 20,
    overflow: "hidden",
  },
  contentInner: {
    width: "100%",
  },
});

export default CustomModal;
