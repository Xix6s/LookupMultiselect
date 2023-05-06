import * as React from "react";

import {
  Stack,
  IDetailsRowProps,
  IRenderFunction,
  CommandBarButton,
  PrimaryButton,
  IIconProps,
  initializeIcons,
  Spinner,
  SpinnerSize,
  IconButton,
  TooltipHost,
} from "@fluentui/react";
import { TextField } from "@fluentui/react/lib/TextField";
import {
  DetailsList,
  DetailsListLayoutMode,
  IDetailsColumnRenderTooltipProps,
  IDetailsHeaderProps,
  Selection,
  SelectionMode,
  IGroup,
} from "@fluentui/react/lib/DetailsList";
import { textFieldStyles } from "./MultiselectRecords.styles";
import { IColumnObject, IMultiselectProps } from "./MultiselectRecords.types";
import { useEffect, useState, useRef } from "react";
import { Utilities } from "./Utilities/Utilities";
import {
  ScrollablePane,
  ScrollbarVisibility,
} from "@fluentui/react/lib/ScrollablePane";
import { Sticky, StickyPositionType } from "@fluentui/react/lib/Sticky";
import { CompoundButton, IButtonStyles } from "@fluentui/react/lib/Button";

const iconButtonStyles: Partial<IButtonStyles> = { root: { marginBottom: -3 } };
export interface IDetailsListGrouped {
  items: IColumnObject[];
  groups: IGroup[];
  showItemIndexInView: boolean;
  isCompactMode: boolean;
}

const MultiselectRecords = (props: IMultiselectProps) => {
  const context = props.context;
  let temporarySelectedItems: [] | any = [];
  const refSearchInput = useRef(null);
  const listRef = useRef(null);
  const clearIcon: IIconProps = { iconName: "Clear" };
  const acceptIcon: IIconProps = {
    iconName: "Accept",
    styles: { root: { color: "white" } },
  };
  const searchIcon: IIconProps = { iconName: "Search" };
  const iconProps = { iconName: "Add" };
  let timeout: any = 0;
  initializeIcons();
  // STATE
  const [showList, setShowList] = useState(false);
  const [listItems, setListItems] = useState(props.records);
  const [groups, setGroups] = useState([]);
  const [textFieldValue, setTextFieldValue] = useState(props.inputValue || "");
  const [searchValue, setSearchValue] = useState("");
  const [selectedRecordItems, setSelectedRecordItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [selection, setSelection] = useState(new Selection());
  const [myItems, setMyItems] = useState([]);
  const [records, setRecords] = useState(
    props.records !== -1 ? props.records : []
  );
  const [isError, setIsError] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [containerHeight, setContainerHeight] = useState(
    props.heightProp || null
  );
  // EFFECT
  useEffect(() => {
    setItemsFromTextFieldValue();
    selectRecordItemsAndPushThem();
  }, [textFieldValue]);
  useEffect(() => {
    setItemsFromRecordsIfNull();
  }, [showList, myItems]);
  useEffect(() => {
    async function DoOnLoad() {
      const recordsRetrieved: any = await getRecordsFromTextField();
      if (recordsRetrieved.entities.length > 0) {
        setSelectedItems(recordsRetrieved.entities);
      }
    }
    DoOnLoad();
  }, []);

  useEffect(() => {
    const errorMessageText =
      isError === 0
        ? ""
        : isError === -1
        ? `No Records Found.`
        : `No Records Found.`;
    setErrorMessage(errorMessageText);
  }, [isError]);

  useEffect(() => {
    setTextFieldValue(props.inputValue || "");
  }, [props.inputValue]);

  // FUNCTIONS
  const getRecordsFromTextField = async () => {
    let filter = `$filter=`;
    const fieldValueArray = getTextFieldJSON();
    if (fieldValueArray.length == 0) {
      return null;
    }
    for (let fieldValue of fieldValueArray) {
      if (fieldValue != null) {
        filter += `${props.attributeid} eq ${JSON.parse(fieldValue)["id"]} or `;
      }
    }
    filter = filter.substring(0, filter.length - 4);
    const addFilter = filter == "$filter=" ? "" : `${filter}`;
    const recordsRetrieved: any = await context.webAPI.retrieveMultipleRecords(
      props.logicalName,
      `?${addFilter}`
    );
    return recordsRetrieved;
  };

  const setColumnGroups = async (recordsPassedParam: any = null) => {
    let recordsPassed = recordsPassedParam.slice();
    let columnKey = props.groupBy;
    let distinctGroups = recordsPassed.reduce(
      (currentGroups: any, currentItem: { [x: string]: any }, index: any) => {
        let lastGroup = currentGroups[currentGroups.length - 1];
        let fieldValue =
          currentItem[columnKey] !== undefined
            ? currentItem[columnKey]
            : currentItem["srm_name"] + " - PARENT";
        let collapsed: boolean = true;

        if (!lastGroup || lastGroup.value != fieldValue) {
          currentGroups.push({
            key: fieldValue + index,
            name: `${fieldValue}`,
            value: fieldValue,
            count: 0,
            startIndex: index,
            level: 0,
            isCollapsed: collapsed,
          });
        }
        if (lastGroup) {
          lastGroup.count = index - lastGroup.startIndex;
        }
        return currentGroups;
      },
      []
    );

    let lastGroup = distinctGroups[distinctGroups.length - 1];
    if (lastGroup) {
      lastGroup.count = recordsPassedParam.length - lastGroup.startIndex;
    }

    setGroups(distinctGroups);
  };

  //Move to Utilities
  const _sortColumns = (items: any, columnKey: string): [] => {
    let key = columnKey;

    return items.slice(0).sort((a: any, b: any) => {
      let fa = a[key] !== undefined ? a[key] : a["srm_name"],
        fb = b[key] !== undefined ? b[key] : b["srm_name"];

      if (fa < fb) {
        return -1;
      }
      if (fa > fb) {
        return 1;
      }
      return 0;
    });
  };

  const setItemsFromRecordsIfNull = () => {
    if (listItems.length == 0) {
      setListItems(records);
    }
  };
  const setItemsFromTextFieldValue = async () => {
    try {
      let valuesInTheTextField: any = [];
      if (
        textFieldValue !== null &&
        textFieldValue !== "" &&
        textFieldValue !== "[]"
      ) {
        let textFieldTemp = JSON.parse(textFieldValue);
        for (var item of textFieldTemp) {
          valuesInTheTextField.push(JSON.stringify(item));
        }
      } else {
        if (textFieldValue == "[]") {
          setTextFieldValue("");
          props.eventOnChangeValue("");
        }
      }
      let itemsThatHaveBeenSelected = await getRecordsFromTextField();
      itemsThatHaveBeenSelected =
        itemsThatHaveBeenSelected == null
          ? []
          : itemsThatHaveBeenSelected.entities;
      setSelectedItems(itemsThatHaveBeenSelected);
      setMyItems(valuesInTheTextField);
    } catch (e) {
      console.log(e);
    }
  };

  const selectRecordItemsAndPushThem = () => {
    selection.setAllSelected(false);
    let itemsSelected: any = [];
    if (selectedRecordItems != null && selectedRecordItems.length > 0) {
      for (var selectedRecordItem of selectedRecordItems) {
        itemsSelected.push(selectedRecordItem);
      }
    } else {
      if (textFieldValue != "" && textFieldValue != "[]") {
        let textFieldTemp = JSON.parse(textFieldValue);
        for (var item of textFieldTemp) {
          itemsSelected.push(JSON.stringify(item));
        }
        setMyItems(itemsSelected);
      }
    }
    selectIndexFromNames();
  };

  /**
   * Method to select item when you click on the row
   */
  const onRenderRow = (
    props?: IDetailsRowProps,
    defaultRender?: IRenderFunction<IDetailsRowProps>
  ): JSX.Element => {
    return (
      <div
        data-selection-toggle="true"
        className="rowCustom"
        onClick={(event: any) => onClickRow(props?.item, event)}
      >
        {defaultRender && defaultRender(props)}
      </div>
    );
  };

  const onClickRow = async (
    item: any,
    event: React.FocusEvent<HTMLElement>
  ) => {
    const rowTarget: any = event.currentTarget;
    const row: any = rowTarget.firstElementChild.classList;
    const selectedItemsChoose =
      temporarySelectedItems.length !== 0
        ? temporarySelectedItems
        : selectedItems;
    let selectedItemsCopy: any = selectedItemsChoose;
    if (props.isMultiple === true) {
      if (row.contains("is-selected")) {
        row.remove("is-selected");
        selectedItemsCopy = selectedItemsChoose.filter(
          (x: any) => x[props.attributeid] !== item[props.attributeid]
        );
      } else {
        row.add("is-selected");
        selectedItemsCopy = selectedItemsChoose;
        selectedItemsCopy.push(item);
      }
      //Remove duplicates
      if (selectedItemsCopy.length > 0) {
        selectedItemsCopy = selectedItemsCopy.filter(
          (a: any, b: any) => selectedItemsCopy.indexOf(a) === b
        );
      }
    } else if (props.isMultiple === false) {
      selectedItemsCopy = [item];
    }
    temporarySelectedItems = selectedItemsCopy;
    setSelectedItems(selectedItemsCopy);
  };

  /**
   * Renders the main text
   */
  const _showMainTextField = (): JSX.Element => {
    if (props.isControlVisible) {
      return (
        <TextField
          className={"text"}
          onChange={userInputOnChange}
          autoComplete="off"
          value={textFieldValue}
          styles={textFieldStyles}
          disabled={props.isControlDisabled}
          placeholder="---"
          data-custom-id="main-custom-field"
        />
      );
    } else {
      return <></>;
    }
  };

  /**
   * Renders the main text
   */
  const _showSecondaryTextField = (): JSX.Element => {
    if (props.isControlVisible) {
      if (textFieldValue !== "" && textFieldValue !== "[]") {
        return (
          <Stack gap="5" horizontal wrap maxWidth={props.widthProp}>
            {myItems != null &&
              myItems.length > 0 &&
              myItems.map((item: any) => {
                const theItem = JSON.parse(item);
                if (!props.isControlDisabled) {
                  return (
                    <Stack
                      horizontal
                      style={{
                        border: "1px solid #106EBE",
                        marginTop: "20px",
                        background: "rgb(0 120 212)",
                      }}
                    >
                      <PrimaryButton
                        primary
                        className="buttonContainer"
                        text={theItem.name}
                        style={{ borderRadius: 0, cursor: "default" }}
                        key={theItem.id}
                        data-id={theItem.id}
                        data-connection={theItem.intersectid}
                        onClick={triggerItemClick}
                      />
                      <IconButton
                        primary
                        iconProps={clearIcon}
                        title="Clear"
                        ariaLabel="Clear"
                        onClick={removeFieldValue}
                        data-custom-id="button-custom-clear"
                        style={{
                          background: "rgb(0 120 212)",
                          color: "white",
                          fontSize: "8px",
                          lineHeight: "8px",
                        }}
                      />
                    </Stack>
                  );
                } else {
                  return (
                    <Stack horizontal style={{ border: "1px solid #106EBE" }}>
                      <PrimaryButton
                        className="buttonContainer"
                        style={{ borderRadius: 0 }}
                        key={theItem.id}
                        data-id={theItem.id}
                        text={theItem.name}
                        onClick={triggerItemClick}
                      />
                    </Stack>
                  );
                }
              })}
          </Stack>
        );
      }
    }
    return <></>;
  };

  /**
   * Renders the search box
   */
  const _showSearchTextField = (): JSX.Element => {
    if (props.isControlVisible && !props.isControlDisabled) {
      return (
        <>
          <div
            style={{
              color: "rgb(0, 0, 255)",
              marginTop: "10px",
              marginRight: "10px",
            }}
          >
            +
          </div>
          <TextField
            className={"text"}
            componentRef={refSearchInput}
            onChange={filterRecords}
            width={props.widthProp}
            autoComplete="off"
            styles={{ root: { flex: 1, position: "relative", marginTop: 10 } }}
            disabled={props.isControlDisabled}
            placeholder="---"
            errorMessage={errorMessage}
            onKeyUp={enterFilterRecords}
            data-custom-id="search-custom-field"
          />
          <PrimaryButton
            iconProps={searchIcon}
            title="Search"
            ariaLabel="Search"
            onClick={filterRecordsClick}
            cellPadding={0}
            width={40}
            styles={{
              root: {
                position: "relative",
                marginTop: 10,
                padding: 0,
                minWidth: 40,
              },
            }}
            data-custom-id="button-custom-search"
          />
        </>
      );
    } else {
      return <></>;
    }
  };

  const onRenderDetailsHeader: IRenderFunction<IDetailsHeaderProps> = (
    props,
    defaultRender
  ) => {
    if (!props) {
      return null;
    }
    const onRenderColumnHeaderTooltip: IRenderFunction<
      IDetailsColumnRenderTooltipProps
    > = (tooltipHostProps) => <TooltipHost {...tooltipHostProps} />;
    return (
      <Sticky stickyPosition={StickyPositionType.Header} isScrollSynced>
        {defaultRender!({
          ...props,
          onRenderColumnHeaderTooltip,
        })}
      </Sticky>
    );
  };

  /**
   * Renders the list and the buttons
   */
  const _showDetailsList = (): JSX.Element => {
    if (listItems.length > 0 && showList == true) {
      return (
        <Stack style={{ marginTop: "-50px;", margin: "auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flex: 1,
              alignContent: "space-between",
            }}
          >
            <CommandBarButton
              data-custom-id="button-custom-select-elements"
              iconProps={acceptIcon}
              text="APPLY"
              onClick={setFieldValue}
              styles={{
                root: {
                  flex: 1,
                  padding: 10,
                  zIndex: 1995,
                  backgroundColor: "#0078D4",
                  color: "white",
                  textAlign: "left",
                },
              }}
            />

            <CommandBarButton
              data-custom-id="button-custom-close"
              iconProps={clearIcon}
              text="CANCEL"
              onClick={clearItems}
              styles={{
                root: {
                  flex: 1,
                  padding: 10,
                  zIndex: 1995,
                  backgroundColor: "lightgrey",
                  textAlign: "left",
                },
              }}
            />
          </div>

          <Sticky
            stickyPosition={StickyPositionType.Header}
            isScrollSynced={true}
          >
            <Stack
              grow
              verticalFill
              className="container"
              style={{ width: props.widthProp, position: "relative" }}
            >
              <Stack.Item
                grow
                className="gridContainer"
                style={{
                  overflowY: "auto",
                  overflowX: "auto",
                  position: "relative",
                }}
              >
                <ScrollablePane
                  className="scrollableContainer"
                  scrollbarVisibility={ScrollbarVisibility.auto}
                  style={{ position: "relative" }}
                >
                  <DetailsList
                    data-custom-id="list-custom-data"
                    isHeaderVisible={props.headerVisible}
                    items={listItems}
                    columns={props.columns}
                    setKey="set"
                    selection={selection}
                    layoutMode={DetailsListLayoutMode.justified}
                    selectionPreservedOnEmptyClick={true}
                    ariaLabelForSelectionColumn="Toggle selection"
                    checkButtonAriaLabel="Checkbox"
                    onRenderRow={onRenderRow}
                    componentRef={listRef}
                    onRenderDetailsHeader={onRenderDetailsHeader}
                    className="detailsListClass"
                    selectionMode={
                      props.isMultiple
                        ? SelectionMode.multiple
                        : SelectionMode.single
                    }
                    groups={groups}
                    groupProps={{
                      showEmptyGroups: true,
                    }}
                  />
                </ScrollablePane>
              </Stack.Item>
            </Stack>
          </Sticky>
        </Stack>
      );
    } else {
      return <></>;
    }
  };

  const triggerItemClick = (a: any): void => {
    const dataid = a.currentTarget.getAttribute("data-id");
    openRecord(props.logicalName, dataid);
  };

  const openRecord = (logicalName: string, id: string): void => {
    const version = Xrm.Utility.getGlobalContext().getVersion().split(".");
    const mobile =
      Xrm.Utility.getGlobalContext().client.getClient() == "Mobile";
    // MFD (main form dialog) is available past ["9", "1", "0000", "15631"]
    // But doesn't work on mobile client
    if (
      !mobile &&
      version.length == 4 &&
      Number.parseFloat(version[0] + "." + version[1]) >= 9.1 &&
      Number.parseFloat(version[2] + "." + version[3]) >= 0.15631
    ) {
      switch (props.openWindow.toLowerCase()) {
        case "no action":
          break;
        case "in a new window":
          (Xrm.Navigation as any).openForm({
            entityName: logicalName,
            entityId: id,
            openInNewWindow: true,
          });
          break;
        case "in the same window":
          (Xrm.Navigation as any).openForm({
            entityName: logicalName,
            entityId: id,
            openInNewWindow: false,
          });
          break;
        default:
        case "in a pop up":
          (Xrm.Navigation as any).navigateTo(
            {
              entityName: logicalName,
              pageType: "entityrecord",
              formType: 2,
              entityId: id,
            },
            { target: 2, position: 1, width: { value: 80, unit: "%" } }
          );
          break;
      }
    } else {
      if (props.openWindow.toLowerCase() != "no action") {
        Xrm.Navigation.openForm({
          entityName: logicalName,
          entityId: id,
        });
      }
    }
  };

  /**
   * When the main field is changed
   */
  const userInputOnChange = (
    event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    // Get the target
    const target = event.target as HTMLTextAreaElement;
    //Set the value of our textfield to the input
    setTextFieldValue(target.value);
    //This is needed for loading the textFieldValue
    props.eventOnChangeValue(target.value);
  };

  /**
   * Main trigger when the searchbox is changed
   */
  const filterRecords = (event: React.FormEvent | null): void => {
    //Set the value of our textfield to the input
    if (event != null) {
      if (
        (event.target as any).value == "" ||
        (event.target as any).value == null
      ) {
        setIsError(0);
        setShowList(false);
        return;
      }
    }
    /*filterRecordsClick();*/
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      await filterRecordsClick();
    }, 500);
  };

  const filterRecordsClick = async () => {
    const searchInputRef: any = refSearchInput.current;
    let searchInputValue = searchInputRef.value;
    setSearchValue(searchInputValue);
    const recordsRetrieved: any = await props.triggerFilter(searchInputValue);

    if (recordsRetrieved != -1 && recordsRetrieved != -2) {
      setIsError(0);
      let recordsSortedByName: any = _sortColumns(recordsRetrieved, "srm_name"); //Props Group By add
      let recordsRetrievedSorted: any = _sortColumns(
        recordsSortedByName,
        props.groupBy
      );

      console.log(recordsSortedByName);

      setColumnGroups(recordsRetrievedSorted);
      setRecords(recordsRetrievedSorted);
      setListItems(recordsRetrievedSorted);
      selection.setItems(recordsRetrievedSorted);

      for (let item of selectedItems) {
        const indexItem = recordsRetrievedSorted.findIndex(
          (x: any) => item[props.attributeid] == x[props.attributeid]
        );
        if (indexItem != -1) {
          selection.setIndexSelected(parseInt(indexItem), true, true);
        }
      }

      if (showList == false) {
        setShowList(true);
      }
    } else {
      setListItems([]);
      selection.setItems([]);
      const numberOfError = recordsRetrieved;
      setIsError(numberOfError);
      setShowList(false);
    }
  };

  const enterFilterRecords = (event: any): void => {
    if (event.key === "Enter") {
      filterRecords(null);
    }
  };

  /**
   * Event when the select elements is clicked
   */
  const setFieldValue = (): void => {
    const valueToBeAssigned: any = fillSelectedItems()[0];
    setMyItems(valueToBeAssigned);
    setTextFieldValue("[" + valueToBeAssigned.toString() + "]");
    props.eventOnChangeValue("[" + valueToBeAssigned.toString() + "]");
    setIsError(0);

    setShowList(false);
  };

  const getTextFieldJSON = () => {
    let myItemsCopy: any = [];
    if (textFieldValue != "" && textFieldValue != "[]") {
      let textFieldTemp = JSON.parse(textFieldValue);
      for (var item of textFieldTemp) {
        myItemsCopy.push(JSON.stringify(item));
      }
    }
    return myItemsCopy;
  };

  /**
   * Click on the remove button next to the tag
   */
  const removeFieldValue = (event: any): void => {
    const selectedRecordItemsCopy = fillSelectedItems()[1];
    const id = event.currentTarget.parentElement
      .getElementsByClassName("buttonContainer")[0]
      .getAttribute("data-id");
    const filterItemsWithoutTheRemovedOne: any = selectedRecordItemsCopy
      .filter((myItem: any) => myItem[props.attributeid] != id)
      .map((x: any) => x);
    const filterSelectedItemsWithoutTheRemovedOne: any = selectedItems
      .filter((myItem: any) => myItem[props.attributeid] != id)
      .map((x: any) => x);

    setSelectedRecordItems(filterItemsWithoutTheRemovedOne);
    setSelectedItems(filterSelectedItemsWithoutTheRemovedOne);
    setSearchValue("");
    const filteredText = JSON.parse(textFieldValue)
      .filter((myItem: any) => myItem["id"] != id)
      .map((x: any) => x);
    const filteredTextString = filteredText.map((x: any) => JSON.stringify(x));
    let text: any = JSON.stringify(filteredText);
    text = text !== "[]" ? text : "";
    setTextFieldValue(text);
    setMyItems(filteredTextString);
    setIsError(0);
    setShowList(false);
    props.triggerFilter("");
    props.eventOnChangeValue(text);
  };

  /**
   * Method to fill the selected items from the box
   */
  const fillSelectedItems = (): any => {
    let listSelection: any = selectedItems;
    listSelection = listSelection.concat(selection.getSelection());
    const listArray: any = Array.isArray(listSelection)
      ? listSelection
      : [listSelection];

    setSelectedRecordItems([]);
    let selectedRecordItemsCopy: any = [];
    let selectedItemsCopy: any = [];
    let guidsAdded: string[] = [];
    let currentValues: any = null;
    if (textFieldValue !== "") {
      currentValues = JSON.parse(textFieldValue);
    }
    for (let newitem of listArray) {
      if (!guidsAdded.includes(newitem[props.attributeid])) {
        let found = false;
        if (currentValues !== null) {
          for (let currentItem of currentValues) {
            if (newitem[props.attributeid] === currentItem.id) {
              selectedRecordItemsCopy.push(currentItem);
              selectedItemsCopy.push(JSON.stringify(currentItem));
              guidsAdded.push(currentItem.id);
              found = true;
              break;
            }
          }
        }
        if (!found) {
          let fieldsToAddToJSON = props.data.split(",");
          console.log(fieldsToAddToJSON);
          selectedRecordItemsCopy.push(newitem);
          let json = {
            id: newitem[props.attributeid],
            name: newitem[fieldsToAddToJSON[0]],
            type: newitem[fieldsToAddToJSON[1]],
            parent: newitem[fieldsToAddToJSON[2]],
            parentGUID: newitem[fieldsToAddToJSON[3]],
            intersectid: "",
          };
          guidsAdded.push(newitem[props.attributeid]);
          selectedItemsCopy.push(JSON.stringify(json));
        }
      }
    }
    setSelectedRecordItems(selectedRecordItemsCopy);
    return [selectedItemsCopy, selectedRecordItemsCopy];
  };

  /**
   * Selects the rows
   */
  const selectIndexFromNames = (recordsProp: any = null): void => {
    if (textFieldValue != "") {
      if (!Utilities.isJson(textFieldValue)) {
        return;
      }
      var values = JSON.parse(textFieldValue);
      const arrayAllItems =
        recordsProp != null
          ? recordsProp
          : listItems != null && listItems.length > 0
          ? listItems
          : recordsProp;
      if (arrayAllItems != null && arrayAllItems.length > 0) {
        for (var item of values.reverse()) {
          var itemFiltered = arrayAllItems.filter(
            (x: any) => x[props.attributeid] == item["id"]
          );
          var index = arrayAllItems.findIndex(
            (x: any) => x[props.attributeid] == item["id"]
          );
          if (index != -1) {
            arrayAllItems.splice(index, 1);
            arrayAllItems.unshift(itemFiltered[0]);
          }
        }

        const copy = arrayAllItems.slice();
        selection.setItems([], true);
        setListItems(copy.slice());
        selection.setItems(copy.slice(), true);

        for (let item of selectedItems) {
          const indexItem = copy.findIndex(
            (x: any) => item[props.attributeid] == x[props.attributeid]
          );
          if (indexItem != -1) {
            selection.setIndexSelected(parseInt(indexItem), true, true);
          }
        }
      }
    }
  };

  /**
   * When close button is triggered
   */
  const clearItems = (): void => {
    setSearchValue("");
    setListItems([]);
    const copyItems = getTextFieldJSON();
    setMyItems(copyItems);
    setIsError(0);
    setShowList(false);
    props.triggerFilter("");
  };

  /**
   * If _allItems is more than 0 then we will create the list.
   * _allItems will populate once it request from fetch
   */
  return (
    <div
      className={"divContainer"}
      style={{
        marginTop:
          textFieldValue !== "" && textFieldValue !== "[]" ? "40px" : "0px",
      }}
    >
      <div className={"control"}>
        {props.populatedFieldVisible == true ? (
          <Stack horizontal>{_showMainTextField()}</Stack>
        ) : (
          <></>
        )}
        <Stack horizontal>{_showSearchTextField()}</Stack>
        <Stack horizontal>{_showSecondaryTextField()}</Stack>
        <div style={{ marginTop: "-50px;" }}>{_showDetailsList()}</div>
      </div>
    </div>
  );
};

export default MultiselectRecords;
