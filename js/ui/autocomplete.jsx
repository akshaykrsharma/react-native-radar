// Autocomplete.js
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Easing,
  SafeAreaView,
} from "react-native";
import Radar from "../index.native";
import { BACK_ICON, SEARCH_ICON, RADAR_LOGO, MARKER_ICON } from './images';
import { default as defaultStyles } from './styles';

const defaultAutocompleteOptions = {
  debounceMS: 200,
  threshold: 3,
  limit: 8,
  placeholder: "Search address",
  showPin: true,
};

const autocompleteUI = ({ options = {}, onSelect, location, style = {} }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current; // animation value
  const timerRef = useRef(null);
  const textInputRef = useRef(null);


  const config = { ...defaultAutocompleteOptions, ...options };

  const fetchResults = useCallback(
    async (searchQuery) => {
      if (searchQuery.length < config.threshold) return;

      const params = { query: searchQuery, limit: config.limit };

      if (location && location.latitude && location.longitude) {
        params.near = location;
      }

      try {
        const result = await Radar.autocomplete(params);
        setResults(result.addresses);
        setIsOpen(true);
      } catch (error) {
        if (config.onError && typeof config.onError === "function") {
          config.onError(error);
        }
      }
    },
    [config]
  );

  const handleInput = useCallback(
    (text) => {
      setQuery(text);

      // Clear the existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (text.length < config.threshold) {
        return;
      }

      // Set the new timer
      timerRef.current = setTimeout(() => {
        fetchResults(text);
      }, config.debounceMS);
    },
    [config, fetchResults]
  );

  const handleSelect = (item) => {
    setQuery(item.formattedAddress);
    setIsOpen(false);

    if (typeof onSelect === "function") {
      onSelect(item);
    }
  };

  const renderFooter = () => {
    if (results.length === 0) return null;

    return (
      <View style={styles.footerContainer}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.footerText}>Powered by</Text>
          <Image
            source={RADAR_LOGO}
            resizeMode="contain"
            style={defaultStyles.logo}
          />
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.addressContainer}>
        <View style={styles.pinIconContainer}>
          {config.showPin ? (
            <Image source={MARKER_ICON} style={styles.pinIcon} />
          ) : null}
        </View>
        <View style={styles.addressTextContainer}>
          <Text numberOfLines={1} style={styles.addressText}>
            {item.addressLabel || item?.placeLabel}
          </Text>
          <Text numberOfLines={1} style={styles.addressSubtext}>
            {item?.formattedAddress?.replace(
              `${item?.addressLabel || item?.placeLabel}, `,
              ""
            )}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = {
    ...defaultStyles,
    container: StyleSheet.compose(defaultStyles.container, style.container),
    input: StyleSheet.compose(defaultStyles.input, style.input),
    inputContainer: StyleSheet.compose(
      defaultStyles.inputContainer,
      style.inputContainer
    ),
    resultList: StyleSheet.compose(defaultStyles.resultList, style.resultList),
    resultItem: StyleSheet.compose(defaultStyles.resultItem, style.resultItem),
    addressContainer: StyleSheet.compose(
      defaultStyles.addressContainer,
      style.addressContainer
    ),
    pinIconContainer: StyleSheet.compose(
      defaultStyles.pinIconContainer,
      style.pinIconContainer
    ),
    pinIcon: StyleSheet.compose(defaultStyles.pinIcon, style.pinIcon),
    addressTextContainer: StyleSheet.compose(
      defaultStyles.addressTextContainer,
      style.addressTextContainer
    ),
    addressText: StyleSheet.compose(
      defaultStyles.addressText,
      style.addressText
    ),
    addressSubtext: StyleSheet.compose(
      defaultStyles.addressSubtext,
      style.addressSubtext
    ),
    footerContainer: StyleSheet.compose(
      defaultStyles.footerContainer,
      style.footerContainer
    ),
    footerText: StyleSheet.compose(defaultStyles.footerText, style.footerText),
  };

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: isOpen ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const screenHeight = Dimensions.get("window").height;

  const inputHeight = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [40, screenHeight],
  });

  const modalOpacity = animationValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ height: inputHeight }}>
        <TouchableOpacity style={styles.inputContainer} onPress={() => { 
          setIsOpen(true);
          // Set the focus on the other textinput after it opens
          setTimeout(() => {
            textInputRef.current.focus();
          }, 100);
        }}>
          <Image source={SEARCH_ICON} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            onFocus={() => {
              setIsOpen(true);
              setTimeout(() => {
                textInputRef.current.focus();
              }, 100);
            }}
            value={query}
            returnKeyType="done"
            placeholder={config.placeholder}
          />
        </TouchableOpacity>
      </Animated.View>
      <Modal
        animationType="slide"
        transparent={false}
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <Animated.View style={{ flex: 1, opacity: modalOpacity }}>
          <SafeAreaView>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={50}
              style={styles.container }
            >
                <View
                  style={styles.inputContainer}
                >
                <TouchableOpacity
                  onPress={() => {
                    setIsOpen(false);
                  }}
                >
                  <Image
                    source={BACK_ICON}
                    style={styles.inputIcon}
                  />
                  </TouchableOpacity>
                  <TextInput
                    ref={textInputRef}
                    style={styles.input}
                    onChangeText={handleInput}
                    value={query}
                    placeholder={config.placeholder}
                    returnKeyType="done"
                    onEndEditing={() => {
                      setIsOpen(false);
                    }}
                  />
                </View>
                {( results.length > 0 && (
                <View style={styles.resultListWrapper}>
                  <FlatList
                    style={styles.resultList}
                    data={results}
                    keyboardShouldPersistTaps='handled'
                    renderItem={renderItem}
                    keyExtractor={(item) =>
                      item.formattedAddress + item.postalCode
                    }
                  />
                  {renderFooter()}
                </View>
                ))}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </View>
  );
};

export default autocompleteUI;
