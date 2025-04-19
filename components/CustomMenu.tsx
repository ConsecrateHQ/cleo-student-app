import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";

interface MenuItemProps {
  text: string;
  onSelect: () => void;
}

interface CustomMenuProps {
  trigger: React.ReactNode;
  items: MenuItemProps[];
}

const CustomMenu: React.FC<CustomMenuProps> = ({ trigger, items }) => {
  const [visible, setVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showMenu = () => {
    if (triggerRef.current) {
      triggerRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          const windowWidth = Dimensions.get("window").width;

          // Position the menu below and aligned to the right of the trigger
          const left =
            windowWidth - pageX - width > 150 ? pageX : windowWidth - 150;

          setMenuPosition({
            top: pageY + height + 5,
            left: left,
          });

          setVisible(true);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      );
    }
  };

  const hideMenu = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  };

  const handleSelect = (onSelect: () => void) => {
    hideMenu();
    onSelect();
  };

  return (
    <>
      <TouchableOpacity ref={triggerRef} onPress={showMenu}>
        {trigger}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={hideMenu}
      >
        <TouchableWithoutFeedback onPress={hideMenu}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.menuContainer,
                {
                  top: menuPosition.top,
                  left: menuPosition.left,
                  opacity: fadeAnim,
                },
              ]}
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => handleSelect(item.onSelect)}
                >
                  <Text style={styles.menuItemText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContainer: {
    position: "absolute",
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 4,
    minWidth: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  menuItemText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default CustomMenu;
